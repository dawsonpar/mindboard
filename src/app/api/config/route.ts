import { NextRequest, NextResponse } from 'next/server';
import { getConfig, saveConfig } from '@/lib/configManager';

export async function GET() {
  const config = getConfig();

  if (!config) {
    return NextResponse.json({ rootDir: '', lastSelectedProject: null });
  }

  return NextResponse.json(config);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const updated = saveConfig(body);
  return NextResponse.json(updated);
}
