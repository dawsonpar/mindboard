import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/lib/configManager';

export async function GET() {
  const config = getConfig();
  const rootDir = config?.rootDir ?? '';

  if (!rootDir || !fs.existsSync(rootDir)) {
    return NextResponse.json({ projects: [] });
  }

  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  const projects = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  return NextResponse.json({ projects });
}

function sanitizeProjectName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const rawName: string = body.name ?? '';

  if (!rawName.trim()) {
    return NextResponse.json(
      { error: 'Project name must be non-empty' },
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

  const sanitized = sanitizeProjectName(rawName);

  if (!sanitized) {
    return NextResponse.json(
      { error: 'Project name contains no valid characters' },
      { status: 400 }
    );
  }

  const projectPath = path.join(rootDir, sanitized);

  if (fs.existsSync(projectPath)) {
    return NextResponse.json(
      { error: `Project "${sanitized}" already exists` },
      { status: 409 }
    );
  }

  fs.mkdirSync(projectPath, { recursive: true });

  return NextResponse.json({ name: sanitized }, { status: 201 });
}
