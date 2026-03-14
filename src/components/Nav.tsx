'use client';

import Link from 'next/link';
import type { SortOption } from '@/types/sort';

interface NavProps {
  projects: string[];
  selectedProject: string | null;
  onProjectChange: (p: string) => void;
  onNewProject: () => void;
  onNewCard: () => void;
  sortBy: SortOption;
  onSortChange: (s: SortOption) => void;
}

const sortLabels: Record<SortOption, string> = {
  priority: 'Priority',
  alpha: 'Alphabetical',
  created: 'Created',
  modified: 'Modified',
};

export function Nav({
  projects,
  selectedProject,
  onProjectChange,
  onNewProject,
  onNewCard,
  sortBy,
  onSortChange,
}: NavProps) {
  return (
    <nav
      className="flex h-14 items-center justify-between border-b border-obsidian-border bg-obsidian-panel px-4"
      role="navigation"
      aria-label="Main navigation"
    >
      <span className="flex items-center gap-2 text-lg font-bold text-obsidian-text">
        <span
          aria-hidden="true"
          className="inline-block w-[22px] h-[22px] bg-obsidian-accent"
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
        MindBoard
      </span>

      <div className="flex items-center gap-2">
        <label htmlFor="project-select" className="sr-only">
          Select project
        </label>
        <select
          id="project-select"
          value={selectedProject ?? ''}
          onChange={(e) => onProjectChange(e.target.value)}
          className="bg-obsidian-bg border border-obsidian-border rounded-input text-obsidian-text px-2 py-1.5 text-sm focus:outline-none focus:border-obsidian-accent"
        >
          {projects.length === 0 && (
            <option value="">No projects</option>
          )}
          {projects.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onNewProject}
          className="bg-obsidian-card border border-obsidian-border text-obsidian-text px-3 py-1.5 rounded-input text-sm hover:border-obsidian-accent transition-colors"
        >
          New Project
        </button>
        <button
          onClick={onNewCard}
          disabled={!selectedProject}
          className="bg-obsidian-accent text-obsidian-text px-3 py-1.5 rounded-input text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
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
          className="bg-obsidian-bg border border-obsidian-border rounded-input text-obsidian-text px-2 py-1.5 text-sm focus:outline-none focus:border-obsidian-accent"
        >
          {(Object.keys(sortLabels) as SortOption[]).map((opt) => (
            <option key={opt} value={opt}>
              {sortLabels[opt]}
            </option>
          ))}
        </select>

        <Link
          href="/settings"
          className="text-obsidian-muted hover:text-obsidian-text p-1.5 transition-colors"
          aria-label="Settings"
        >
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
        </Link>
      </div>
    </nav>
  );
}
