import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/lib/configManager';
import { markRecentWrite } from '@/lib/fileWatcher';

interface RouteParams {
  params: Promise<{ project: string; filename: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { project, filename } = await params;

  const body: { restore?: boolean } = await request.json().catch(() => ({}));
  const restore = body.restore ?? false;

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

  const srcPath = restore
    ? path.join(archiveDir, filename)
    : path.join(projectDir, filename);
  const destPath = restore
    ? path.join(projectDir, filename)
    : path.join(archiveDir, filename);

  if (!fs.existsSync(srcPath)) {
    return NextResponse.json(
      { error: `Card "${filename}" not found` },
      { status: 404 }
    );
  }

  if (fs.existsSync(destPath)) {
    return NextResponse.json(
      { error: `Card "${filename}" already exists at destination` },
      { status: 409 }
    );
  }

  if (!restore) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }

  markRecentWrite(srcPath);
  markRecentWrite(destPath);
  fs.renameSync(srcPath, destPath);

  return NextResponse.json({ success: true });
}
