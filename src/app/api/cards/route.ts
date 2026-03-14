import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/lib/configManager';
import { parseCardContent } from '@/lib/cardParser';
import { cardToMarkdown } from '@/lib/cardWriter';
import type { Card, CardPriority, CardStatus, RawSection } from '@/types/card';

export async function GET(request: NextRequest) {
  const project = request.nextUrl.searchParams.get('project');

  if (!project) {
    return NextResponse.json(
      { error: 'Missing required query param: project' },
      { status: 400 }
    );
  }

  const config = getConfig();
  const rootDir = config?.rootDir ?? '';

  if (!rootDir) {
    return NextResponse.json({ cards: [] });
  }

  const projectDir = path.join(rootDir, project);

  if (!fs.existsSync(projectDir)) {
    return NextResponse.json({ cards: [] });
  }

  const entries = fs.readdirSync(projectDir, { withFileTypes: true });
  const cards: Card[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;

    const absolutePath = path.join(projectDir, entry.name);
    const content = fs.readFileSync(absolutePath, 'utf-8');
    const stats = fs.statSync(absolutePath);

    const card = parseCardContent(content, entry.name, project, absolutePath, {
      birthtimeMs: stats.birthtimeMs,
      mtimeMs: stats.mtimeMs,
    });

    cards.push(card);
  }

  return NextResponse.json({ cards });
}

function deriveFilename(title: string): string {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

  return `${slug}.md`;
}

interface CreateCardBody {
  project: string;
  title: string;
  status?: CardStatus;
  priority?: CardPriority;
  description?: string;
}

export async function POST(request: NextRequest) {
  const body: CreateCardBody = await request.json();

  if (!body.project || !body.title?.trim()) {
    return NextResponse.json(
      { error: 'Missing required fields: project and title' },
      { status: 400 }
    );
  }

  const config = getConfig();
  const rootDir = config?.rootDir ?? '';

  if (!rootDir) {
    return NextResponse.json(
      { error: 'Root directory is not configured' },
      { status: 400 }
    );
  }

  const projectDir = path.join(rootDir, body.project);

  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }

  const filename = deriveFilename(body.title);
  const absolutePath = path.join(projectDir, filename);

  if (fs.existsSync(absolutePath)) {
    return NextResponse.json(
      { error: `Card file "${filename}" already exists` },
      { status: 409 }
    );
  }

  const rawSections: RawSection[] = [
    { heading: 'Title', content: body.title.trim() },
    { heading: 'Status', content: body.status ?? 'TODO' },
    { heading: 'Priority', content: body.priority ?? '' },
    { heading: 'Description', content: body.description ?? '' },
    { heading: 'Tasks', content: '' },
    { heading: 'Comments', content: '' },
  ];

  const now = new Date().toISOString();

  const card: Card = {
    filename,
    project: body.project,
    absolutePath,
    title: body.title.trim(),
    status: body.status ?? 'TODO',
    priority: body.priority ?? null,
    description: body.description ?? '',
    tasks: [],
    references: [],
    comments: '',
    createdAt: now,
    modifiedAt: now,
    hasErrors: false,
    errorMessages: [],
    rawSections,
  };

  const markdown = cardToMarkdown(card);
  fs.writeFileSync(absolutePath, markdown, 'utf-8');

  const stats = fs.statSync(absolutePath);
  const createdCard = parseCardContent(
    markdown,
    filename,
    body.project,
    absolutePath,
    { birthtimeMs: stats.birthtimeMs, mtimeMs: stats.mtimeMs }
  );

  return NextResponse.json(createdCard, { status: 201 });
}
