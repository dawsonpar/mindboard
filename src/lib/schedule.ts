import { createHash } from 'node:crypto';

/**
 * A card's planned date: all-day (`2026-10-20`), timed with a default
 * length (`2026-10-20 14:00`), or a same-day range (`2026-10-20 14:00-15:30`).
 */
export interface Schedule {
  date: string;
  start: string | null;
  end: string | null;
}

export type EventTime = { date: string } | { dateTime: string; timeZone?: string };

export interface EventTimes {
  start: EventTime;
  end: EventTime;
}

const DEFAULT_DURATION_MIN = 60;
const SCHEDULE_RE = /^(\d{4}-\d{2}-\d{2})(?:\s+(\d{1,2}:\d{2})(?:-(\d{1,2}:\d{2}))?)?$/;

export function parseSchedule(raw: string): Schedule | null {
  const match = raw.trim().match(SCHEDULE_RE);
  if (!match) return null;
  const [, date, startRaw, endRaw] = match;
  if (!isValidDate(date)) return null;

  const start = startRaw ? normalizeTime(startRaw) : null;
  const end = endRaw ? normalizeTime(endRaw) : null;
  if (startRaw && !start) return null;
  if (endRaw && (!end || end <= start!)) return null;
  return { date, start, end };
}

export function formatSchedule(s: Schedule): string {
  if (!s.start) return s.date;
  return s.end ? `${s.date} ${s.start}-${s.end}` : `${s.date} ${s.start}`;
}

/** Google Calendar start/end for a schedule. All-day ends are exclusive. */
export function toEventTimes(s: Schedule, timeZone: string): EventTimes {
  if (!s.start) {
    return { start: { date: s.date }, end: { date: shiftNaive(`${s.date}T00:00`, 24 * 60).slice(0, 10) } };
  }
  const startNaive = `${s.date}T${s.start}`;
  const endNaive = s.end ? `${s.date}T${s.end}` : shiftNaive(startNaive, DEFAULT_DURATION_MIN);
  return {
    start: { dateTime: `${startNaive}:00`, timeZone },
    end: { dateTime: `${endNaive}:00`, timeZone },
  };
}

/** Canonical schedule string for event times. Spans past one day collapse to the start day. */
export function fromEventTimes(times: EventTimes, timeZone: string): string {
  if ('date' in times.start) return times.start.date;
  const start = toLocal(times.start.dateTime, timeZone);
  if (!('dateTime' in times.end)) return `${start.date} ${start.time}`;
  const end = toLocal(times.end.dateTime, timeZone);
  if (end.date !== start.date || end.time <= start.time) return `${start.date} ${start.time}`;
  return `${start.date} ${start.time}-${end.time}`;
}

/** The schedule as Google would report it back, so equal plans compare equal. */
export function effectiveSchedule(raw: string, timeZone: string): string | null {
  const parsed = parseSchedule(raw);
  return parsed ? fromEventTimes(toEventTimes(parsed, timeZone), timeZone) : null;
}

/** Deterministic event id. Hex digits are a subset of Google's base32hex alphabet. */
export function eventIdFor(project: string, filename: string): string {
  return createHash('sha256').update(`${project}/${filename}`).digest('hex');
}

function isValidDate(date: string): boolean {
  const d = new Date(`${date}T00:00:00Z`);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
}

function normalizeTime(raw: string): string | null {
  const [h, m] = raw.split(':').map(Number);
  if (h > 23 || m > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Adds minutes to a zone-less `YYYY-MM-DDTHH:MM`, returning the same shape. */
function shiftNaive(naive: string, minutes: number): string {
  const d = new Date(`${naive}:00Z`);
  d.setUTCMinutes(d.getUTCMinutes() + minutes);
  return d.toISOString().slice(0, 16);
}

function toLocal(dateTime: string, timeZone: string): { date: string; time: string } {
  const hasOffset = /(Z|[+-]\d{2}:\d{2})$/.test(dateTime);
  if (!hasOffset) return { date: dateTime.slice(0, 10), time: dateTime.slice(11, 16) };

  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    })
      .formatToParts(new Date(dateTime))
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

export type ScheduleInput = { isValid: true; value: string | null } | { isValid: false; error: string };

/** Validates a schedule from an API body: a schedule string, or null/'' to clear it. */
export function readScheduleInput(input: unknown): ScheduleInput {
  if (input === null || input === '') return { isValid: true, value: null };
  const parsed = typeof input === 'string' ? parseSchedule(input) : null;
  if (!parsed) {
    return { isValid: false, error: `Invalid schedule ${JSON.stringify(input)}, expected YYYY-MM-DD [HH:MM[-HH:MM]]` };
  }
  return { isValid: true, value: formatSchedule(parsed) };
}
