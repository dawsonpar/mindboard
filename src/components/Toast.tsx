'use client';

import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'info' | 'error' | 'success';
  onDismiss: () => void;
}

const borderColorMap: Record<ToastProps['type'], string> = {
  info: 'border-l-obsidian-accent',
  error: 'border-l-priority-p0',
  success: 'border-l-[#22c55e]',
};

export function Toast({ message, type, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div
        className={`bg-obsidian-card border border-obsidian-border border-l-4 ${borderColorMap[type]} rounded-card px-4 py-3 text-sm text-obsidian-text max-w-sm`}
        role="alert"
      >
        <div className="flex items-center justify-between gap-3">
          <span>{message}</span>
          <button
            onClick={onDismiss}
            className="text-obsidian-muted hover:text-obsidian-text shrink-0"
            aria-label="Dismiss notification"
          >
            &#x2715;
          </button>
        </div>
      </div>
    </div>
  );
}
