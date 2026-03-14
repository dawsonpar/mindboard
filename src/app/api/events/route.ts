export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/configManager';
import { addClient, removeClient } from '@/lib/sseManager';
import { initWatcher, getWatcher } from '@/lib/fileWatcher';

export async function GET() {
  const config = getConfig();
  const rootDir = config?.rootDir ?? '';

  if (rootDir && !getWatcher()) {
    initWatcher(rootDir);
  }

  let clientController: ReadableStreamDefaultController;

  const stream = new ReadableStream({
    start(controller) {
      clientController = controller;
      addClient(controller);

      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'));
    },
    cancel() {
      removeClient(clientController);
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
