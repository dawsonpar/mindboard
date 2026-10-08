import fs from 'fs';

/** What the calendar was last told about one event, and which card it belongs to. */
export interface PushedEvent {
  card: string;
  schedule: string | null;
  summary: string;
  colorId: string | null;
  description?: string;
  pushedAt: string;
}

/** Persisted sync state: the change cursor, last pushed values, and pushes awaiting retry. */
export interface SyncState {
  syncToken: string | null;
  pushed: Record<string, PushedEvent>;
  dirty: string[];
}

let lastWritten = '';

export function loadState(file: string): SyncState {
  const empty: SyncState = { syncToken: null, pushed: {}, dirty: [] };
  if (!fs.existsSync(file)) return empty;
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf-8'));
    return { syncToken: raw.syncToken ?? null, pushed: raw.pushed ?? {}, dirty: raw.dirty ?? [] };
  } catch (err) {
    console.error(`[gcal] state file ${file} unreadable, starting a full resync:`, err);
    return empty;
  }
}

/** Atomic write, skipped when nothing changed. */
export function saveState(file: string, state: SyncState): void {
  const json = JSON.stringify(state) + '\n';
  if (json === lastWritten) return;
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, json, { mode: 0o600 });
  fs.renameSync(tmp, file);
  lastWritten = json;
}

export function markDirty(state: SyncState, key: string, isDirty: boolean): void {
  const has = state.dirty.includes(key);
  if (isDirty && !has) state.dirty.push(key);
  if (!isDirty && has) state.dirty = state.dirty.filter((k) => k !== key);
}
