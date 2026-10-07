import fs from 'fs';
import path from 'path';
import type { Card } from '@/types/card';
import { parseCardContent } from '@/lib/cardParser';
import { cardToMarkdown } from '@/lib/cardWriter';
import { getConfig } from '@/lib/configManager';
import { effectiveSchedule, eventIdFor, fromEventTimes, parseSchedule, toEventTimes } from '@/lib/schedule';
import { CalendarClient, CalendarHttpError, type CalendarEvent } from './client';
import { isProjectSynced, loadGcalConfig, type GcalConfig } from './config';
import { loadState, markDirty, saveState, type PushedEvent, type SyncState } from './state';

const COMPLETED_COLOR_ID = '8';

interface Sync {
  config: GcalConfig;
  client: CalendarClient;
  state: SyncState;
}

type Desired = Pick<PushedEvent, 'schedule' | 'summary' | 'colorId'>;

// Next loads instrumentation and route handlers as separate module instances; globalThis keeps one sync.
const shared = globalThis as typeof globalThis & {
  mbGcal?: { instance: Sync | null; chains: Map<string, Promise<void>> };
};

/**
 * Queues a push of the card's current state on disk to its calendar event.
 * Pushes and pulls for one event run in order. Never rejects.
 */
export function pushCard(project: string, filename: string): Promise<void> {
  const s = getSync();
  if (!s || !isProjectSynced(s.config, project)) return Promise.resolve();
  return enqueue(eventIdFor(project, filename), () => pushNow(s, project, filename)).catch((err) => {
    console.error(`[gcal] push ${project}/${filename} failed:`, err);
  });
}

/** Applies calendar-side moves and deletions back onto cards. A failure leaves the cursor in place. */
export async function pullChanges(): Promise<void> {
  const s = getSync();
  if (!s) return;
  try {
    await pullPages(s);
  } catch (err) {
    if (!(err instanceof CalendarHttpError && err.status === 410)) throw err;
    s.state.syncToken = null;
    await pullPages(s);
  }
}

export function startCalendarPoller(): void {
  const s = getSync();
  if (!s) {
    console.info('[gcal] GCAL_CALENDAR_ID or GCAL_SA_KEY_FILE unset, calendar sync off');
    return;
  }
  let isRunning = false;
  const tick = async (keys: string[]) => {
    if (isRunning) return;
    isRunning = true;
    try {
      await Promise.all(keys.map((key) => pushCard(...splitKey(key))));
      await pullChanges();
    } catch (err) {
      console.error('[gcal] poll failed:', err);
    } finally {
      isRunning = false;
    }
  };
  void tick(listSyncedCards(s.config));
  setInterval(() => tick([...s.state.dirty]), s.config.pollSeconds * 1000);
}

function getSync(): Sync | null {
  if (!shared.mbGcal) {
    const config = loadGcalConfig();
    const instance = config
      ? { config, client: new CalendarClient(config.keyFile, config.calendarId), state: loadState(config.stateFile) }
      : null;
    shared.mbGcal = { instance, chains: new Map() };
  }
  return shared.mbGcal.instance;
}

/** Runs task after earlier work for the same event. The returned promise rejects if task does. */
function enqueue(id: string, task: () => Promise<void>): Promise<void> {
  const chains = shared.mbGcal!.chains;
  const run = (chains.get(id) ?? Promise.resolve()).then(task);
  const settled = run.catch(() => undefined);
  chains.set(id, settled);
  void settled.then(() => {
    if (chains.get(id) === settled) chains.delete(id);
  });
  return run;
}

async function pushNow(s: Sync, project: string, filename: string): Promise<void> {
  const key = `${project}/${filename}`;
  const absolutePath = resolveCardPath(project, filename);
  if (!absolutePath || !fs.existsSync(absolutePath)) return settle(s, key);

  const card = readCard(absolutePath, project);
  const id = eventIdFor(project, filename);
  const desired = desiredEvent(s.config, card);
  const last = s.state.pushed[id];
  if (desired.schedule === null && (last?.schedule ?? null) === null) return settle(s, key);
  if (last && isSamePush(desired, last)) return settle(s, key);

  try {
    const updated = await sendPush(s, card, id, desired, last);
    s.state.pushed[id] = { ...desired, card: key, pushedAt: updated };
    settle(s, key);
  } catch (err) {
    const isRetryable = !(err instanceof CalendarHttpError) || err.isRetryable;
    settle(s, key, isRetryable);
    if (!isRetryable) console.error(`[gcal] ${key} rejected by Google, not retrying until the card changes`);
    throw err;
  }
}

/** Sends the smallest change Google needs and returns the event's new `updated` time. */
async function sendPush(s: Sync, card: Card, id: string, desired: Desired, last?: PushedEvent): Promise<string> {
  if (desired.schedule === null) {
    await s.client.deleteEvent(id);
    return new Date().toISOString();
  }
  const full = buildEvent(s.config, card, id, desired);
  const patch: Partial<CalendarEvent> = { summary: full.summary, colorId: desired.colorId, description: full.description };
  if (desired.schedule !== last?.schedule) {
    Object.assign(patch, { status: 'confirmed', start: full.start, end: full.end, extendedProperties: full.extendedProperties });
  }
  const saved = await s.client.upsertEvent(id, patch, full);
  return saved.updated ?? new Date().toISOString();
}

function settle(s: Sync, key: string, isDirty = false): void {
  markDirty(s.state, key, isDirty);
  saveState(s.config.stateFile, s.state);
}

async function pullPages(s: Sync): Promise<void> {
  let pageToken: string | undefined;
  let nextSyncToken = s.state.syncToken;
  do {
    const page = await s.client.listChanges(s.state.syncToken, pageToken);
    for (const event of page.items) await enqueue(event.id, async () => applyEvent(s, event));
    pageToken = page.nextPageToken;
    if (page.nextSyncToken) nextSyncToken = page.nextSyncToken;
  } while (pageToken);
  s.state.syncToken = nextSyncToken;
  saveState(s.config.stateFile, s.state);
}

/** Google wins only while the card still matches what was last pushed; otherwise the card is re-pushed. */
function applyEvent(s: Sync, event: CalendarEvent): void {
  const last = s.state.pushed[event.id];
  const key = last?.card ?? keyFromProperties(event);
  if (!key) return;
  const [project, filename] = splitKey(key);
  const absolutePath = resolveCardPath(project, filename);
  if (!isProjectSynced(s.config, project) || !absolutePath || !fs.existsSync(absolutePath)) return;
  if (last && event.updated && Date.parse(event.updated) < Date.parse(last.pushedAt)) return;

  const card = readCard(absolutePath, project);
  const current = desiredEvent(s.config, card).schedule;
  if (current !== (last?.schedule ?? null)) {
    markDirty(s.state, key, true);
    return;
  }

  const next = nextSchedule(s.config, event, current);
  if (next === undefined) return;
  const comments = next === null ? appendDeletedNote(s.config, card.comments) : card.comments;
  fs.writeFileSync(absolutePath, cardToMarkdown({ ...card, schedule: next, comments }), 'utf-8');
  s.state.pushed[event.id] = {
    ...(last ?? { summary: '', colorId: null }),
    card: key,
    schedule: next === null ? null : effectiveSchedule(next, s.config.timeZone),
    pushedAt: event.updated ?? new Date().toISOString(),
  };
}

/** Card key from event metadata, trusted only when it hashes to the event's own id. */
function keyFromProperties(event: CalendarEvent): string | null {
  const props = event.extendedProperties?.private;
  if (!props?.mbProject || !props.mbFile) return null;
  return eventIdFor(props.mbProject, props.mbFile) === event.id ? `${props.mbProject}/${props.mbFile}` : null;
}

/** The card's new schedule, or undefined when it already matches the event. */
function nextSchedule(config: GcalConfig, event: CalendarEvent, current: string | null): string | null | undefined {
  if (event.status === 'cancelled') return current === null ? undefined : null;
  if (!event.start || !event.end) return undefined;
  const fromEvent = fromEventTimes({ start: event.start, end: event.end }, config.timeZone);
  return effectiveSchedule(fromEvent, config.timeZone) === current ? undefined : fromEvent;
}

function desiredEvent(config: GcalConfig, card: Card): Desired {
  return {
    schedule: card.schedule ? effectiveSchedule(card.schedule, config.timeZone) : null,
    summary: `[${card.project}] ${card.title}`,
    colorId: card.status === 'COMPLETED' ? COMPLETED_COLOR_ID : null,
  };
}

function isSamePush(a: Desired, b: Desired): boolean {
  return a.schedule === b.schedule && a.summary === b.summary && a.colorId === b.colorId;
}

function buildEvent(config: GcalConfig, card: Card, id: string, desired: Desired): CalendarEvent {
  const url = config.publicUrl
    ? `${config.publicUrl}/card/${encodeURIComponent(card.project)}/${encodeURIComponent(card.filename)}`
    : undefined;
  return {
    id,
    status: 'confirmed',
    summary: desired.summary,
    description: url,
    colorId: desired.colorId ?? undefined,
    extendedProperties: { private: { mbProject: card.project, mbFile: card.filename } },
    ...toEventTimes(parseSchedule(desired.schedule!)!, config.timeZone),
  };
}

function appendDeletedNote(config: GcalConfig, comments: string): string {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: config.timeZone }).format(new Date());
  const note = `[MindBoard - ${today}] Event deleted in Google Calendar, schedule cleared.`;
  return comments.trim() ? `${comments.trimEnd()}\n\n${note}` : note;
}

/** Every card in a synced project, so cards scheduled before sync existed get pushed once. */
function listSyncedCards(config: GcalConfig): string[] {
  const rootDir = getConfig()?.rootDir;
  if (!rootDir || !fs.existsSync(rootDir)) return [];
  return fs
    .readdirSync(rootDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.') && isProjectSynced(config, d.name))
    .flatMap((d) =>
      fs
        .readdirSync(path.join(rootDir, d.name))
        .filter((f) => f.endsWith('.md') && !f.startsWith('.'))
        .map((f) => `${d.name}/${f}`),
    );
}

/** Card path under the board root, or null for anything that could escape it. */
function resolveCardPath(project: string, filename: string): string | null {
  const rootDir = getConfig()?.rootDir;
  if (!rootDir || !project || /[/\\]/.test(project) || project.startsWith('.')) return null;
  if (path.basename(filename) !== filename || !filename.endsWith('.md')) return null;
  const root = path.resolve(rootDir);
  const resolved = path.resolve(root, project, filename);
  return resolved.startsWith(root + path.sep) ? resolved : null;
}

function splitKey(key: string): [string, string] {
  const slash = key.indexOf('/');
  return [key.slice(0, slash), key.slice(slash + 1)];
}

function readCard(absolutePath: string, project: string): Card {
  const stats = fs.statSync(absolutePath);
  return parseCardContent(fs.readFileSync(absolutePath, 'utf-8'), path.basename(absolutePath), project, absolutePath, {
    birthtimeMs: stats.birthtimeMs,
    mtimeMs: stats.mtimeMs,
  });
}
