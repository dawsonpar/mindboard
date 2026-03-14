import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/lib/configManager';
import { parseCardContent } from '@/lib/cardParser';
import { cardToMarkdown } from '@/lib/cardWriter';
import { markRecentWrite } from '@/lib/fileWatcher';
import type { Card, CardPriority, CardStatus, Task } from '@/types/card';

interface RouteParams {
  params: Promise<{ project: string; filename: string }>;
}

interface CardUpdateBody {
  title?: string;
  status?: CardStatus;
  priority?: CardPriority;
  description?: string;
  tasks?: Task[];
  comments?: string;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { project, filename } = await params;
  const body: CardUpdateBody = await request.json();

  const config = getConfig();
  const rootDir = config?.rootDir ?? '';

  if (!rootDir) {
    return NextResponse.json(
      { error: 'Root directory is not configured' },
      { status: 400 }
    );
  }

  const absolutePath = path.join(rootDir, project, filename);

  if (!fs.existsSync(absolutePath)) {
    return NextResponse.json(
      { error: `Card "${filename}" not found in project "${project}"` },
      { status: 404 }
    );
  }

  const content = fs.readFileSync(absolutePath, 'utf-8');
  const stats = fs.statSync(absolutePath);
  const card = parseCardContent(content, filename, project, absolutePath, {
    birthtimeMs: stats.birthtimeMs,
    mtimeMs: stats.mtimeMs,
  });

  const updated: Card = {
    ...card,
    title: body.title ?? card.title,
    status: body.status !== undefined ? body.status : card.status,
    priority: body.priority !== undefined ? body.priority : card.priority,
    description: body.description ?? card.description,
    tasks: body.tasks ?? card.tasks,
    comments: body.comments ?? card.comments,
  };

  const markdown = cardToMarkdown(updated);

  markRecentWrite(absolutePath);
  fs.writeFileSync(absolutePath, markdown, 'utf-8');

  const newStats = fs.statSync(absolutePath);
  const resultCard = parseCardContent(
    markdown,
    filename,
    project,
    absolutePath,
    { birthtimeMs: newStats.birthtimeMs, mtimeMs: newStats.mtimeMs }
  );

  return NextResponse.json(resultCard);
}
