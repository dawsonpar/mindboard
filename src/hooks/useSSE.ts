'use client';

import { useEffect, useRef } from 'react';

interface SSEEvent {
  type: string;
  project: string;
  filename: string;
}

export function useSSE(onEvent: (event: SSEEvent) => void) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let unmounted = false;

    function connect() {
      if (unmounted) return;

      eventSource = new EventSource('/api/events');

      eventSource.onmessage = (event) => {
        try {
          const data: SSEEvent = JSON.parse(event.data);
          if (data.type !== 'connected') {
            onEventRef.current(data);
          }
        } catch {
          // Ignore malformed messages
        }
      };

      eventSource.onerror = () => {
        eventSource?.close();
        if (!unmounted) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      };
    }

    connect();

    return () => {
      unmounted = true;
      eventSource?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []);
}
