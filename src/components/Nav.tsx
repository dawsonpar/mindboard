'use client';

import Link from 'next/link';
import type { SortOption } from '@/types/sort';
import { CommandBar, type CommandAction } from '@/components/CommandBar';

interface NavProps {
  selectedProject: string | null;
  onNewCard: () => void;
  sortBy: SortOption;
  onSortChange: (s: SortOption) => void;
  onSelectCard: (project: string, filename: string) => void;
  commands: CommandAction[];
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

function SettingsIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

const sortLabels: Record<SortOption, string> = {
  priority: 'Priority',
  alpha: 'Alphabetical',
  created: 'Created',
  modified: 'Modified',
  complexity: 'Complexity',
};

export function Nav({
  selectedProject,
  onNewCard,
  sortBy,
  onSortChange,
  onSelectCard,
  commands,
  sidebarOpen,
  onToggleSidebar,
}: NavProps) {
  return (
    <nav
      className="border-b border-obsidian-border bg-obsidian-panel px-4"
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo | command bar | controls. Stacks on mobile. */}
      <div className="flex flex-col sm:flex-row sm:h-14 sm:items-center py-2 sm:py-0 gap-2 sm:gap-4">
        {/* Logo: the brain toggles the project sidebar */}
        <div className="flex items-center justify-between sm:justify-start sm:flex-1">
          <span className="flex items-center gap-2 text-lg font-bold text-obsidian-text">
            <button
              type="button"
              onClick={onToggleSidebar}
              aria-label={sidebarOpen ? 'Close project sidebar' : 'Open project sidebar'}
              aria-expanded={sidebarOpen}
              title="Toggle projects (⌘⇧,)"
              className="inline-flex items-center justify-center rounded p-1 transition-colors hover:bg-[color-mix(in_srgb,var(--color-obsidian-text),transparent_92%)]"
            >
              <span
                aria-hidden="true"
                className={`inline-block w-[22px] h-[22px] shrink-0 transition-colors ${
                  sidebarOpen ? 'bg-obsidian-muted' : 'bg-obsidian-accent'
                }`}
                style={{
                  maskImage: 'url(/brain.png)',
                  maskSize: 'contain',
                  maskRepeat: 'no-repeat',
                  maskPosition: 'center',
                  WebkitMaskImage: 'url(/brain.png)',
                  WebkitMaskSize: 'contain',
                  WebkitMaskRepeat: 'no-repeat',
                  WebkitMaskPosition: 'center',
                }}
              />
            </button>
            MindBoard
          </span>

          {/* Settings icon: visible inline on mobile, hidden on sm+ */}
          <Link
            href="/settings"
            className="text-obsidian-muted hover:text-obsidian-text p-1.5 transition-colors sm:hidden"
            aria-label="Settings"
          >
            <SettingsIcon />
          </Link>
        </div>

        {/* Command bar (centered) */}
        <div className="flex shrink-0 justify-center">
          <CommandBar onSelectCard={onSelectCard} commands={commands} />
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:flex-1">
          <button
            onClick={onNewCard}
            disabled={!selectedProject}
            className="bg-obsidian-accent text-obsidian-text px-3 py-1.5 rounded-input text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            New Card
          </button>

          <label htmlFor="sort-select" className="sr-only">
            Sort cards by
          </label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="bg-obsidian-bg border border-obsidian-border rounded-input text-obsidian-text px-2 py-1.5 text-sm focus:outline-none focus:border-obsidian-accent min-w-0"
          >
            {(Object.keys(sortLabels) as SortOption[]).map((opt) => (
              <option key={opt} value={opt}>
                {sortLabels[opt]}
              </option>
            ))}
          </select>

          {/* Settings icon: hidden on mobile (shown above), visible on sm+ */}
          <Link
            href="/settings"
            className="text-obsidian-muted hover:text-obsidian-text p-1.5 transition-colors hidden sm:block"
            aria-label="Settings"
          >
            <SettingsIcon />
          </Link>
        </div>
      </div>
    </nav>
  );
}
