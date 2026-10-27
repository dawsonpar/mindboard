import { useSyncExternalStore } from 'react';

const APPLE_PLATFORM = /Mac|iPhone|iPad/i;

function subscribeToNothing() {
  return () => {};
}

/**
 * True on Apple platforms, where shortcuts show the Command key. The server
 * render has no user agent, so it returns false there and the client
 * corrects it after hydration.
 */
export function useIsMac(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => APPLE_PLATFORM.test(navigator.userAgent),
    () => false,
  );
}
