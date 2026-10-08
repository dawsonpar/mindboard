import { NextRequest, NextResponse } from 'next/server';
import { inspectEvent } from '@/lib/gcal/sync';

interface RouteParams {
  params: Promise<{ project: string; filename: string }>;
}

/** Live calendar event for a card, including whether its description was edited in Google. */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { project, filename } = await params;
  try {
    return NextResponse.json(await inspectEvent(project, filename));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
