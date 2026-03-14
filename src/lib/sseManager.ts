interface SseEvent {
  type: string;
  project: string;
  filename: string;
}

const clients = new Set<ReadableStreamDefaultController>();

export function addClient(controller: ReadableStreamDefaultController): void {
  clients.add(controller);
}

export function removeClient(controller: ReadableStreamDefaultController): void {
  clients.delete(controller);
}

export function broadcast(event: SseEvent): void {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  const encoder = new TextEncoder();
  const encoded = encoder.encode(data);

  for (const controller of clients) {
    try {
      controller.enqueue(encoded);
    } catch {
      clients.delete(controller);
    }
  }
}
