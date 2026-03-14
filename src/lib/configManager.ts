import fs from 'fs';
import path from 'path';
import type { MindBoardConfig } from '@/types/config';

const CONFIG_FILENAME = 'mindboard.config.json';

function getConfigPath(): string {
  return path.join(process.cwd(), CONFIG_FILENAME);
}

export function getConfig(): MindBoardConfig | null {
  const configPath = getConfigPath();

  if (!fs.existsSync(configPath)) {
    return null;
  }

  const raw = fs.readFileSync(configPath, 'utf-8');
  return JSON.parse(raw) as MindBoardConfig;
}

export function saveConfig(partial: Partial<MindBoardConfig>): MindBoardConfig {
  const existing = getConfig();

  const merged: MindBoardConfig = {
    rootDir: partial.rootDir ?? existing?.rootDir ?? '',
    lastSelectedProject:
      partial.lastSelectedProject !== undefined
        ? partial.lastSelectedProject
        : (existing?.lastSelectedProject ?? null),
  };

  const configPath = getConfigPath();
  fs.writeFileSync(configPath, JSON.stringify(merged, null, 2) + '\n', 'utf-8');

  return merged;
}
