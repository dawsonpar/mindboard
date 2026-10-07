import path from 'path';

export interface GcalConfig {
  calendarId: string;
  keyFile: string;
  stateFile: string;
  timeZone: string;
  excludePrefix: string | null;
  publicUrl: string | null;
  pollSeconds: number;
}

/** Reads calendar sync settings from the environment. Null means sync is off. */
export function loadGcalConfig(env: NodeJS.ProcessEnv = process.env): GcalConfig | null {
  const calendarId = env.GCAL_CALENDAR_ID;
  const keyFile = env.GCAL_SA_KEY_FILE;
  if (!calendarId || !keyFile) return null;

  return {
    calendarId,
    keyFile,
    stateFile: env.GCAL_STATE_FILE || path.join(path.dirname(keyFile), 'gcal-state.json'),
    timeZone: env.GCAL_TIMEZONE || Intl.DateTimeFormat().resolvedOptions().timeZone,
    excludePrefix: env.GCAL_EXCLUDE_PREFIX || null,
    publicUrl: env.MINDBOARD_PUBLIC_URL || null,
    pollSeconds: Math.max(30, Math.floor(Number(env.GCAL_POLL_SECONDS) || 120)),
  };
}

export function isProjectSynced(config: GcalConfig, project: string): boolean {
  return !config.excludePrefix || !project.startsWith(config.excludePrefix);
}
