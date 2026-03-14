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
  references?: string[];
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

  const newReferences = body.references !== undefined ? body.references : card.references;

  const updated: Card = {
    ...card,
    title: body.title ?? card.title,
    status: body.status !== undefined ? body.status : card.status,
    priority: body.priority !== undefined ? body.priority : card.priority,
    description: body.description ?? card.description,
    tasks: body.tasks ?? card.tasks,
    references: newReferences,
    comments: body.comments ?? card.comments,
  };

  const markdown = cardToMarkdown(updated);

  markRecentWrite(absolutePath);
  fs.writeFileSync(absolutePath, markdown, 'utf-8');

  // Bidirectional sync: update backlinks in referenced cards
  if (body.references !== undefined) {
    const oldRefs = new Set(card.references);
    const newRefs = new Set(newReferences);
    const added = newReferences.filter((r) => !oldRefs.has(r));
    const removed = card.references.filter((r) => !newRefs.has(r));

    for (const refFilename of added) {
      const refPath = path.join(rootDir, project, refFilename);
      if (!fs.existsSync(refPath)) continue;
      const refContent = fs.readFileSync(refPath, 'utf-8');
      const refStats = fs.statSync(refPath);
      const refCard = parseCardContent(refContent, refFilename, project, refPath, {
        birthtimeMs: refStats.birthtimeMs,
        mtimeMs: refStats.mtimeMs,
      });
      if (!refCard.references.includes(filename)) {
        const updatedRef = { ...refCard, references: [...refCard.references, filename] };
        markRecentWrite(refPath);
        fs.writeFileSync(refPath, cardToMarkdown(updatedRef), 'utf-8');
      }
    }

    for (const refFilename of removed) {
      const refPath = path.join(rootDir, project, refFilename);
      if (!fs.existsSync(refPath)) continue;
      const refContent = fs.readFileSync(refPath, 'utf-8');
      const refStats = fs.statSync(refPath);
      const refCard = parseCardContent(refContent, refFilename, project, refPath, {
        birthtimeMs: refStats.birthtimeMs,
        mtimeMs: refStats.mtimeMs,
      });
      if (refCard.references.includes(filename)) {
        const updatedRef = {
          ...refCard,
          references: refCard.references.filter((r) => r !== filename),
        };
        markRecentWrite(refPath);
        fs.writeFileSync(refPath, cardToMarkdown(updatedRef), 'utf-8');
      }
    }
  }

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
