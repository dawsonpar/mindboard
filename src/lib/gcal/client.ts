import fs from 'fs';
import { createSign } from 'crypto';
import type { EventTimes } from '@/lib/schedule';

const SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const API = 'https://www.googleapis.com/calendar/v3';
const TOKEN_TTL_S = 3600;

export interface CalendarEvent extends Partial<EventTimes> {
  id: string;
  status?: string;
  updated?: string;
  summary?: string;
  description?: string;
  colorId?: string | null;
  extendedProperties?: { private?: Record<string, string> };
}

export interface ChangePage {
  items: CalendarEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
}

export class CalendarHttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(`Google Calendar ${status}: ${message}`);
  }

  get isRetryable(): boolean {
    return this.status === 429 || this.status >= 500;
  }
}

/** Minimal Calendar v3 client authenticated as a service account. */
export class CalendarClient {
  private token: { value: string; expiresAt: number } | null = null;
  private tokenRequest: Promise<string> | null = null;

  constructor(private readonly keyFile: string, private readonly calendarId: string) {}

  /** Patches only the given fields, creating the event from `full` when it does not exist yet. */
  async upsertEvent(id: string, patch: Partial<CalendarEvent>, full: CalendarEvent): Promise<CalendarEvent> {
    try {
      return (await this.request('PATCH', `/events/${id}`, patch)) as CalendarEvent;
    } catch (err) {
      if (!(err instanceof CalendarHttpError) || err.status !== 404) throw err;
      return (await this.request('POST', '/events', full)) as CalendarEvent;
    }
  }

  /** The live event, or null when it does not exist. */
  async getEvent(id: string): Promise<CalendarEvent | null> {
    try {
      return (await this.request('GET', `/events/${id}`)) as CalendarEvent;
    } catch (err) {
      if (err instanceof CalendarHttpError && err.status === 404) return null;
      throw err;
    }
  }

  async deleteEvent(id: string): Promise<void> {
    try {
      await this.request('DELETE', `/events/${id}`);
    } catch (err) {
      if (err instanceof CalendarHttpError && (err.status === 404 || err.status === 410)) return;
      throw err;
    }
  }

  /** One page of changes. Throws CalendarHttpError 410 when the sync token expired. */
  async listChanges(syncToken: string | null, pageToken?: string): Promise<ChangePage> {
    const params = new URLSearchParams({ maxResults: '250', showDeleted: 'true' });
    if (syncToken) params.set('syncToken', syncToken);
    if (pageToken) params.set('pageToken', pageToken);
    return (await this.request('GET', `/events?${params}`)) as ChangePage;
  }

  private async request(method: string, pathAndQuery: string, body?: unknown): Promise<unknown> {
    const url = `${API}/calendars/${encodeURIComponent(this.calendarId)}${pathAndQuery}`;
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${await this.accessToken()}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) throw new CalendarHttpError(res.status, await res.text());
    return res.status === 204 ? null : res.json();
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) return this.token.value;
    this.tokenRequest ??= this.fetchToken().finally(() => {
      this.tokenRequest = null;
    });
    return this.tokenRequest;
  }

  private async fetchToken(): Promise<string> {
    const key = JSON.parse(fs.readFileSync(this.keyFile, 'utf-8'));
    const res = await fetch(key.token_uri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: signJwt(key.client_email, key.private_key, key.token_uri),
      }),
    });
    if (!res.ok) throw new CalendarHttpError(res.status, `token exchange failed: ${await res.text()}`);
    const { access_token, expires_in } = await res.json();
    this.token = { value: access_token, expiresAt: Date.now() + expires_in * 1000 };
    return access_token;
  }
}

function signJwt(clientEmail: string, privateKey: string, audience: string): string {
  const now = Math.floor(Date.now() / 1000);
  const encode = (obj: object) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({
    iss: clientEmail, scope: SCOPE, aud: audience, iat: now, exp: now + TOKEN_TTL_S,
  })}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(privateKey, 'base64url');
  return `${unsigned}.${signature}`;
}
