'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { CardPriority, CardStatus } from '@/types/card';

export interface SearchResult {
  project: string;
  filename: string;
  title: string;
  status: CardStatus | null;
  priority: CardPriority | null;
}

export interface CommandAction {
  id: string;
  title: string;
  run: () => void;
}

interface CommandBarProps {
  onSelectCard: (project: string, filename: string) => void;
  commands: CommandAction[];
}

const MIN_QUERY = 2;
const MAX_RESULTS = 25;

// Slightly darker than the nav surface, derived from the theme token so it
// holds up in light, dark, and custom palettes (no hardcoded color).
const BAR_BG = 'bg-[color-mix(in_srgb,var(--color-obsidian-bg),#000_7%)]';

const priorityColor: Record<string, string> = {
  P0: 'text-priority-p0',
  P1: 'text-priority-p1',
  P2: 'text-priority-p2',
  P3: 'text-priority-p3',
};

// Lower score = better match. Returns null when the title does not match.
function scoreTitle(title: string, query: string): number | null {
  const t = title.toLowerCase();
  const q = query.toLowerCase();
  const idx = t.indexOf(q);
  if (idx === 0) return 0; // prefix
  if (idx > 0) {
    const prev = t[idx - 1];
    return prev === ' ' || prev === '-' ? 1 : 2; // word-start vs substring
  }
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length ? 3 : null; // subsequence fallback
}

function Empty({ text }: { text: string }) {
  return <p className="px-3 py-4 text-xs text-obsidian-muted">{text}</p>;
}

// VSCode-style command center in the nav. The card index is preloaded once on
// mount (and refreshed on focus), so search filters locally and feels instant.
// Typing searches card titles across all projects; a leading ">" lists commands.
export function CommandBar({ onSelectCard, commands }: CommandBarProps) {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [index, setIndex] = useState<SearchResult[]>([]);
  const [indexLoaded, setIndexLoaded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isCommandMode = value.startsWith('>');
  const commandQuery = isCommandMode ? value.slice(1).trim().toLowerCase() : '';
  const trimmed = value.trim();

  // Preload the searchable card index; refreshed on focus to stay current.
  const loadIndex = useCallback(async () => {
    try {
      const res = await fetch('/api/search');
      const data = await res.json();
      setIndex(data.cards ?? []);
    } catch {
      // keep any previously loaded index
    } finally {
      setIndexLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadIndex();
  }, [loadIndex]);

  const filteredCommands = useMemo(
    () =>
      isCommandMode
        ? commands.filter((c) => c.title.toLowerCase().includes(commandQuery))
        : [],
    [isCommandMode, commands, commandQuery],
  );

  // Local fuzzy search over the preloaded index (no network per keystroke).
  const results = useMemo(() => {
    if (isCommandMode || trimmed.length < MIN_QUERY) return [];
    const scored: { card: SearchResult; score: number }[] = [];
    for (const card of index) {
      const score = scoreTitle(card.title, trimmed);
      if (score === null) continue;
      scored.push({ card, score });
    }
    scored.sort((a, b) => a.score - b.score || a.card.title.length - b.card.title.length);
    return scored.slice(0, MAX_RESULTS).map((s) => s.card);
  }, [index, trimmed, isCommandMode]);

  const open = focused && (isCommandMode || trimmed.length >= MIN_QUERY);
  const listLength = isCommandMode ? filteredCommands.length : results.length;

  // Global shortcut: jump focus to the bar.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === 'KeyP') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [value]);

  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]');
    if (el) (el as HTMLElement).scrollIntoView({ block: 'nearest' });
  }, [activeIndex, listLength]);

  const close = useCallback(() => {
    setValue('');
    inputRef.current?.blur();
  }, []);

  const selectActive = useCallback(() => {
    if (isCommandMode) {
      const cmd = filteredCommands[activeIndex];
      if (cmd) {
        close();
        cmd.run();
      }
    } else {
      const r = results[activeIndex];
      if (r) {
        close();
        onSelectCard(r.project, r.filename);
      }
    }
  }, [isCommandMode, filteredCommands, results, activeIndex, onSelectCard, close]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (listLength === 0 ? 0 : Math.min(i + 1, listLength - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      selectActive();
    }
  }

  return (
    <div className="relative w-full sm:w-[400px]">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => {
          setFocused(true);
          loadIndex();
        }}
        onBlur={() => setFocused(false)}
        onKeyDown={handleKeyDown}
        placeholder="Search cards by name"
        aria-label="Search cards or run a command"
        className={`w-full ${BAR_BG} border border-obsidian-border px-3 py-1.5 text-sm text-obsidian-text placeholder:text-obsidian-muted focus:outline-none ${
          open
            ? 'rounded-t-[var(--radius-input)] rounded-b-none'
            : 'rounded-input focus:border-obsidian-accent'
        }`}
      />

      {!focused && value === '' && (
        <div
          className={`absolute inset-0 flex items-center justify-center gap-2 rounded-input ${BAR_BG} text-sm text-obsidian-text pointer-events-none`}
        >
          <span aria-hidden="true" className="text-[1.45rem] leading-none">⌕</span>
          <span>Search</span>
        </div>
      )}

      {open && (
        <div
          ref={listRef}
          className="absolute top-full left-0 right-0 max-h-[60vh] overflow-y-auto rounded-t-none rounded-b-[var(--radius-input)] border border-t-0 border-obsidian-border bg-obsidian-panel shadow-2xl z-50"
        >
          {isCommandMode ? (
            filteredCommands.length === 0 ? (
              <Empty text="No matching commands" />
            ) : (
              filteredCommands.map((cmd, i) => (
                <button
                  key={cmd.id}
                  data-active={i === activeIndex}
                  onMouseEnter={() => setActiveIndex(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    close();
                    cmd.run();
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                    i === activeIndex
                      ? 'bg-obsidian-card text-obsidian-text'
                      : 'text-obsidian-muted'
                  }`}
                >
                  {cmd.title}
                </button>
              ))
            )
          ) : results.length === 0 ? (
            <Empty text={indexLoaded ? 'No cards found' : 'Loading...'} />
          ) : (
            results.map((r, i) => (
              <button
                key={`${r.project}/${r.filename}`}
                data-active={i === activeIndex}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  close();
                  onSelectCard(r.project, r.filename);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left ${
                  i === activeIndex ? 'bg-obsidian-card' : ''
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-obsidian-text">{r.title}</span>
                  <span className="block truncate text-[11px] text-obsidian-muted">{r.project}</span>
                </span>
                {r.priority && (
                  <span
                    className={`text-[10px] font-medium ${priorityColor[r.priority] ?? 'text-obsidian-muted'}`}
                  >
                    {r.priority}
                  </span>
                )}
                {r.status && (
                  <span className="whitespace-nowrap rounded-full border border-obsidian-border px-1.5 py-0.5 text-[10px] text-obsidian-muted">
                    {r.status}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
