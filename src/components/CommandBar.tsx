'use client';

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react';
import type { CardPriority, CardStatus } from '@/types/card';
import { formatCombo } from '@/lib/shortcuts';
import { useIsMac } from '@/hooks/useIsMac';

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
  /** Extra terms the fuzzy matcher searches in ">" command mode. */
  keywords?: string[];
  /** Raw combo string (e.g. "Mod+Shift+Period"); formatted for display. */
  shortcut?: string;
  run: () => void;
}

export interface CommandBarHandle {
  focusSearch: () => void;
  focusCommands: () => void;
}

interface CommandBarProps {
  onSelectCard: (project: string, filename: string) => void;
  commands: CommandAction[];
  /** Effective binding for the search action; shown as the resting hint. */
  searchCombo: string;
}

const MIN_QUERY = 2;
const MAX_RESULTS = 25;

/**
 * Slightly darker than the nav surface. It derives from the theme token, so
 * it works in light, dark and custom palettes without a hardcoded color.
 */
const BAR_BG = 'bg-[color-mix(in_srgb,var(--color-obsidian-bg),#000_7%)]';

const priorityColor: Record<string, string> = {
  P0: 'text-priority-p0',
  P1: 'text-priority-p1',
  P2: 'text-priority-p2',
  P3: 'text-priority-p3',
};

/**
 * Scores how well text matches a query. A lower score is a better match: 0 for
 * a prefix, 1 for a word start, 2 for a substring and 3 for a subsequence.
 * Returns null when the text does not match.
 */
function scoreText(text: string, query: string): number | null {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  const idx = t.indexOf(q);
  if (idx === 0) return 0;
  if (idx > 0) {
    const prev = t[idx - 1];
    return prev === ' ' || prev === '-' ? 1 : 2;
  }
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length ? 3 : null;
}

/** Best score across the title and keywords of a command. */
function scoreCommand(cmd: CommandAction, query: string): number | null {
  let best: number | null = null;
  for (const text of [cmd.title, ...(cmd.keywords ?? [])]) {
    const s = scoreText(text, query);
    if (s !== null && (best === null || s < best)) best = s;
  }
  return best;
}

function Empty({ text }: { text: string }) {
  return <p className="px-3 py-4 text-xs text-obsidian-muted">{text}</p>;
}

const ACTIVE_ROW =
  'bg-[color-mix(in_srgb,var(--color-obsidian-accent),transparent_82%)] shadow-[inset_2px_0_0_0_var(--color-obsidian-accent)]';

interface CommandRowProps {
  command: CommandAction;
  isActive: boolean;
  isMac: boolean;
  onHover: () => void;
  onRun: (command: CommandAction) => void;
}

function CommandRow({ command, isActive, isMac, onHover, onRun }: CommandRowProps) {
  return (
    <button
      data-active={isActive}
      onMouseEnter={onHover}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onRun(command)}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
        isActive ? `${ACTIVE_ROW} text-obsidian-text` : 'text-obsidian-muted'
      }`}
    >
      <span className="min-w-0 flex-1 truncate">{command.title}</span>
      {command.shortcut && (
        <span className="shrink-0 rounded border border-obsidian-border px-1.5 py-0.5 text-[10px] leading-none text-obsidian-muted">
          {formatCombo(command.shortcut, isMac)}
        </span>
      )}
    </button>
  );
}

interface ResultRowProps {
  result: SearchResult;
  isActive: boolean;
  onHover: () => void;
  onOpen: (result: SearchResult) => void;
}

function ResultRow({ result, isActive, onHover, onOpen }: ResultRowProps) {
  return (
    <button
      data-active={isActive}
      onMouseEnter={onHover}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onOpen(result)}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left ${isActive ? ACTIVE_ROW : ''}`}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-obsidian-text">{result.title}</span>
        <span className="block truncate text-[11px] text-obsidian-muted">{result.project}</span>
      </span>
      {result.priority && (
        <span
          className={`text-[10px] font-medium ${priorityColor[result.priority] ?? 'text-obsidian-muted'}`}
        >
          {result.priority}
        </span>
      )}
      {result.status && (
        <span className="whitespace-nowrap rounded-full border border-obsidian-border px-1.5 py-0.5 text-[10px] text-obsidian-muted">
          {result.status}
        </span>
      )}
    </button>
  );
}

/**
 * VSCode-style command center in the nav. The card index loads once on mount
 * and again on focus, so search filters it locally with no request per
 * keystroke. Typing searches card titles across all projects, and a leading
 * ">" lists commands. page.tsx owns the global open shortcuts and moves focus
 * through the ref.
 */
export const CommandBar = forwardRef<CommandBarHandle, CommandBarProps>(
  function CommandBar({ onSelectCard, commands, searchCombo }, ref) {
    const [value, setValue] = useState('');
    const [focused, setFocused] = useState(false);
    const [index, setIndex] = useState<SearchResult[] | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const isMac = useIsMac();

    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const isCommandMode = value.startsWith('>');
    const commandQuery = isCommandMode ? value.slice(1).trim().toLowerCase() : '';
    const trimmed = value.trim();

    const changeValue = useCallback((next: string) => {
      setValue(next);
      setActiveIndex(0);
    }, []);

    const loadIndex = useCallback(() => {
      return fetch('/api/search')
        .then((res) => res.json())
        .then((data) => setIndex(data.cards ?? []))
        .catch(() => setIndex((prev) => prev ?? []));
    }, []);

    useEffect(() => {
      loadIndex();
    }, [loadIndex]);

    useImperativeHandle(ref, () => ({
      focusSearch: () => {
        changeValue('');
        inputRef.current?.focus();
      },
      focusCommands: () => {
        changeValue('>');
        inputRef.current?.focus();
      },
    }));

    const filteredCommands = useMemo(() => {
      if (!isCommandMode) return [];
      if (commandQuery === '') return commands;
      const scored: { cmd: CommandAction; score: number }[] = [];
      for (const cmd of commands) {
        const score = scoreCommand(cmd, commandQuery);
        if (score === null) continue;
        scored.push({ cmd, score });
      }
      scored.sort((a, b) => a.score - b.score || a.cmd.title.length - b.cmd.title.length);
      return scored.map((s) => s.cmd);
    }, [isCommandMode, commands, commandQuery]);

    const results = useMemo(() => {
      if (isCommandMode || trimmed.length < MIN_QUERY) return [];
      const scored: { card: SearchResult; score: number }[] = [];
      for (const card of index ?? []) {
        const score = scoreText(card.title, trimmed);
        if (score === null) continue;
        scored.push({ card, score });
      }
      scored.sort((a, b) => a.score - b.score || a.card.title.length - b.card.title.length);
      return scored.slice(0, MAX_RESULTS).map((s) => s.card);
    }, [index, trimmed, isCommandMode]);

    const open = focused && (isCommandMode || trimmed.length >= MIN_QUERY);
    const listLength = isCommandMode ? filteredCommands.length : results.length;

    useEffect(() => {
      const el = listRef.current?.querySelector('[data-active="true"]');
      if (el) (el as HTMLElement).scrollIntoView({ block: 'nearest' });
    }, [activeIndex, listLength]);

    const close = useCallback(() => {
      changeValue('');
      inputRef.current?.blur();
    }, [changeValue]);

    const runCommand = useCallback(
      (cmd: CommandAction) => {
        close();
        cmd.run();
      },
      [close],
    );

    const openCard = useCallback(
      (r: SearchResult) => {
        close();
        onSelectCard(r.project, r.filename);
      },
      [close, onSelectCard],
    );

    const selectActive = useCallback(() => {
      if (isCommandMode) {
        const cmd = filteredCommands[activeIndex];
        if (cmd) runCommand(cmd);
      } else {
        const r = results[activeIndex];
        if (r) openCard(r);
      }
    }, [isCommandMode, filteredCommands, results, activeIndex, runCommand, openCard]);

    /**
     * ArrowDown or Ctrl+J moves down, ArrowUp or Ctrl+K moves up. Ctrl+K also
     * opens the bar globally, so the bar takes it only while the list is open.
     * Ctrl+J stops here so that it does not reach the browser.
     */
    function handleKeyDown(e: React.KeyboardEvent) {
      const navDown = e.key === 'ArrowDown' || (e.ctrlKey && e.key === 'j');
      const navUp = e.key === 'ArrowUp' || (e.ctrlKey && e.key === 'k');

      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      } else if (navDown) {
        if (!open) return;
        e.preventDefault();
        if (e.ctrlKey) e.stopPropagation();
        setActiveIndex((i) => (listLength === 0 ? 0 : Math.min(i + 1, listLength - 1)));
      } else if (navUp) {
        if (!open) return;
        e.preventDefault();
        if (e.ctrlKey) e.stopPropagation();
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
          onChange={(e) => changeValue(e.target.value)}
          onFocus={() => {
            setFocused(true);
            loadIndex();
          }}
          onBlur={() => {
            setFocused(false);
            changeValue('');
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search cards, or type > for commands"
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
            <span className="absolute right-3 rounded border border-obsidian-border px-1.5 py-0.5 text-[10px] leading-none text-obsidian-muted">
              {formatCombo(searchCombo, isMac)}
            </span>
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
                  <CommandRow
                    key={cmd.id}
                    command={cmd}
                    isActive={i === activeIndex}
                    isMac={isMac}
                    onHover={() => setActiveIndex(i)}
                    onRun={runCommand}
                  />
                ))
              )
            ) : results.length === 0 ? (
              <Empty text={index === null ? 'Loading...' : 'No cards found'} />
            ) : (
              results.map((r, i) => (
                <ResultRow
                  key={`${r.project}/${r.filename}`}
                  result={r}
                  isActive={i === activeIndex}
                  onHover={() => setActiveIndex(i)}
                  onOpen={openCard}
                />
              ))
            )}
          </div>
        )}
      </div>
    );
  },
);

CommandBar.displayName = 'CommandBar';
