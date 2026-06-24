import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/configManager';
import { parseCardContent } from '@/lib/cardParser';
import type { CardPriority, CardStatus } from '@/types/card';

// Lightweight card index for the command bar. The client preloads this once
// and filters/ranks locally, so searching is instant (no per-keystroke
// network or disk reads). Re-fetched on focus to stay current.
export interface IndexedCard {
  project: string;
  filename: string;
  title: string;
  status: CardStatus | null;
  priority: CardPriority | null;
}

export async function GET() {
  const config = getConfig();
  const rootDir = config?.rootDir ?? '';
  if (!rootDir || !fs.existsSync(rootDir)) {
    return NextResponse.json({ cards: [] });
  }

  const projectDirs = fs
    .readdirSync(rootDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'));

  const cards: IndexedCard[] = [];

  for (const projDir of projectDirs) {
    const project = projDir.name;
    const projectPath = path.join(rootDir, project);

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(projectPath, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      // Active cards only: top-level .md files (archive lives in a subdir).
      if (!entry.isFile() || !entry.name.endsWith('.md') || entry.name.startsWith('.')) {
        continue;
      }

      const absolutePath = path.join(projectPath, entry.name);
      let content: string;
      try {
        content = fs.readFileSync(absolutePath, 'utf-8');
      } catch {
        continue;
      }

      const card = parseCardContent(content, entry.name, project, absolutePath, {
        birthtimeMs: 0,
        mtimeMs: 0,
      });

      cards.push({
        project,
        filename: entry.name,
        title: card.title,
        status: card.status,
        priority: card.priority,
      });
    }
  }

  return NextResponse.json({ cards });
}
