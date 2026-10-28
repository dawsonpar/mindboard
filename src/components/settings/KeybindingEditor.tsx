'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  SHORTCUTS,
  resolveBindings,
  eventToCombo,
  comboToString,
  formatCombo,
} from '@/lib/shortcuts';
import { useIsMac } from '@/hooks/useIsMac';

interface KeybindingEditorProps {
  onToast: (message: string, type: 'info' | 'error' | 'success') => void;
}

/**
 * Editor for the global shortcut bindings. It loads and saves the
 * keybindings part of the config on its own, and each change saves at once.
 * While a row captures, modifier keys alone are ignored, the next full key
 * combination becomes its binding, and Esc cancels. A combination that
 * another shortcut uses shows an error and capture continues. The board page
 * reads new bindings when it next mounts.
 */
export function KeybindingEditor({ onToast }: KeybindingEditorProps) {
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [capturingId, setCapturingId] = useState<string | null>(null);
  const isMac = useIsMac();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/config');
        const data = await res.json();
        if (data.keybindings) setOverrides(data.keybindings);
      } catch {
        onToast('Failed to load shortcuts', 'error');
      }
    }
    load();
  }, [onToast]);

  const persist = useCallback(
    async (next: Record<string, string>) => {
      try {
        const res = await fetch('/api/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keybindings: next }),
        });
        if (!res.ok) throw new Error();
        onToast('Shortcut saved', 'success');
      } catch {
        onToast('Failed to save shortcut', 'error');
      }
    },
    [onToast],
  );

  useEffect(() => {
    if (!capturingId) return;
    const id = capturingId;
    function onKeyDown(e: KeyboardEvent) {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') {
        setCapturingId(null);
        return;
      }
      const combo = eventToCombo(e);
      if (!combo) return;
      const comboStr = comboToString(combo);
      const eff = resolveBindings(overrides);
      const clash = SHORTCUTS.find(
        (s) => s.id !== id && eff[s.id] === comboStr,
      );
      if (clash) {
        onToast(`Already bound to "${clash.label}"`, 'error');
        return;
      }
      const next = { ...overrides, [id]: comboStr };
      setOverrides(next);
      setCapturingId(null);
      persist(next);
    }
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [capturingId, overrides, persist, onToast]);

  function resetOne(id: string) {
    const next = { ...overrides };
    delete next[id];
    setOverrides(next);
    persist(next);
  }

  function resetAll() {
    setOverrides({});
    persist({});
  }

  const effective = resolveBindings(overrides);
  const hasOverrides = Object.keys(overrides).length > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-obsidian-text">Keyboard shortcuts</h2>
        <button
          type="button"
          onClick={resetAll}
          disabled={!hasOverrides}
          className="text-xs text-obsidian-muted hover:text-obsidian-text transition-colors disabled:opacity-40"
        >
          Reset all
        </button>
      </div>

      <ul className="divide-y divide-obsidian-border">
        {SHORTCUTS.map((s) => {
          const capturing = capturingId === s.id;
          const overridden = overrides[s.id] !== undefined;
          return (
            <li key={s.id} className="flex items-center gap-3 py-2.5">
              <span className="flex-1 min-w-0 truncate text-sm text-obsidian-text">
                {s.label}
              </span>
              {overridden && (
                <button
                  type="button"
                  onClick={() => resetOne(s.id)}
                  className="text-[11px] text-obsidian-muted hover:text-obsidian-text transition-colors"
                >
                  Reset
                </button>
              )}
              <button
                type="button"
                onClick={() => setCapturingId(capturing ? null : s.id)}
                aria-label={`Change shortcut for ${s.label}`}
                className={`min-w-[96px] rounded-input border px-2 py-1 text-xs transition-colors ${
                  capturing
                    ? 'animate-pulse border-obsidian-accent text-obsidian-accent'
                    : 'border-obsidian-border text-obsidian-text hover:border-obsidian-accent'
                }`}
              >
                {capturing ? 'Press keys' : formatCombo(effective[s.id], isMac)}
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-[11px] text-obsidian-muted">
        Click a shortcut, then press the key combination. Esc cancels.
      </p>
    </div>
  );
}
