import path from 'path';
import { watch, type FSWatcher } from 'chokidar';
import { broadcast } from '@/lib/sseManager';

let watcher: FSWatcher | null = null;
let currentRootDir: string | null = null;

const recentWrites = new Map<string, number>();
const RECENT_WRITE_TTL_MS = 500;

export function markRecentWrite(filePath: string): void {
  recentWrites.set(filePath, Date.now());
}

export function wasRecentWrite(filePath: string): boolean {
  const timestamp = recentWrites.get(filePath);
  if (timestamp === undefined) return false;

  recentWrites.delete(filePath);
  return Date.now() - timestamp < RECENT_WRITE_TTL_MS;
}

function handleFileEvent(
  eventType: string,
  filePath: string,
  rootDir: string
): void {
  if (!filePath.endsWith('.md')) return;
  if (wasRecentWrite(filePath)) return;

  const relative = path.relative(rootDir, filePath);
  const parts = relative.split(path.sep);

  if (parts.length < 2) return;

  const project = parts[0];
  const filename = parts[parts.length - 1];

  broadcast({ type: eventType, project, filename });
}

export function initWatcher(rootDir: string): void {
  if (watcher && currentRootDir === rootDir) return;

  if (watcher) {
    watcher.close();
    watcher = null;
  }

  currentRootDir = rootDir;

  watcher = watch(rootDir, {
    ignoreInitial: true,
    depth: 2,
    ignored: /(^|[/\\])\../,
  });

  watcher.on('add', (filePath: string) => {
    handleFileEvent('card_added', filePath, rootDir);
  });

  watcher.on('change', (filePath: string) => {
    handleFileEvent('card_updated', filePath, rootDir);
  });

  watcher.on('unlink', (filePath: string) => {
    handleFileEvent('card_deleted', filePath, rootDir);
  });
}

export function getWatcher(): FSWatcher | null {
  return watcher;
}
