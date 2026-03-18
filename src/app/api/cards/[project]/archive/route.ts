import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/lib/configManager';
import { parseCardContent } from '@/lib/cardParser';
import { markRecentWrite } from '@/lib/fileWatcher';

interface RouteParams {
  params: Promise<{ project: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { project } = await params;

  const config = getConfig();
  const rootDir = config?.rootDir ?? '';

  if (!rootDir) {
    return NextResponse.json(
      { error: 'Root directory is not configured' },
      { status: 400 }
    );
  }

  const projectDir = path.join(rootDir, project);
  const archiveDir = path.join(projectDir, 'archive');

  if (!fs.existsSync(projectDir)) {
    return NextResponse.json({ archived: [] });
  }

  const entries = fs.readdirSync(projectDir, { withFileTypes: true });
  const archived: string[] = [];

  fs.mkdirSync(archiveDir, { recursive: true });

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;

    const absolutePath = path.join(projectDir, entry.name);
    const content = fs.readFileSync(absolutePath, 'utf-8');
    const stats = fs.statSync(absolutePath);

    const card = parseCardContent(content, entry.name, project, absolutePath, {
      birthtimeMs: stats.birthtimeMs,
      mtimeMs: stats.mtimeMs,
    });

    if (card.status !== 'COMPLETED') continue;

    const destPath = path.join(archiveDir, entry.name);
    if (fs.existsSync(destPath)) continue;

    markRecentWrite(absolutePath);
    markRecentWrite(destPath);
    fs.renameSync(absolutePath, destPath);
    archived.push(entry.name);
  }

  return NextResponse.json({ archived });
}
