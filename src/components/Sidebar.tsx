'use client';

import { useEffect, useRef, useState } from 'react';

interface SidebarProps {
  projects: string[];
  selectedProject: string | null;
  onSelectProject: (project: string) => void;
  onCreateProject: (name: string) => Promise<boolean>;
}

// Selected/hover backgrounds are derived via color-mix so they stay visible in
// any theme. (obsidian-card equals panel in the light theme, so it can't be
// used as a highlight on the panel surface.)
const SELECTED =
  'bg-[color-mix(in_srgb,var(--color-obsidian-accent),transparent_85%)] text-obsidian-text';
const UNSELECTED =
  'text-obsidian-muted hover:bg-[color-mix(in_srgb,var(--color-obsidian-text),transparent_93%)] hover:text-obsidian-text';

function PlusIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function Sidebar({
  projects,
  selectedProject,
  onSelectProject,
  onCreateProject,
}: SidebarProps) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (creating) inputRef.current?.focus();
  }, [creating]);

  function startCreate() {
    setName('');
    cancelRef.current = false;
    setCreating(true);
  }

  // Single commit path via blur. Enter blurs (commit), Escape flags cancel.
  async function handleBlur() {
    if (cancelRef.current) {
      cancelRef.current = false;
      setCreating(false);
      setName('');
      return;
    }
    const trimmed = name.trim();
    setCreating(false);
    setName('');
    if (trimmed) await onCreateProject(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelRef.current = true;
      inputRef.current?.blur();
    }
  }

  return (
    <aside className="flex h-full w-60 flex-col border-r border-obsidian-border bg-obsidian-panel">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-obsidian-muted">
          Projects
        </span>
        <button
          type="button"
          onClick={startCreate}
          aria-label="New project"
          title="New project"
          className="rounded p-0.5 text-obsidian-muted transition-colors hover:text-obsidian-text"
        >
          <PlusIcon />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {creating && (
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder="Project name"
            aria-label="New project name"
            className="mb-0.5 block w-full rounded border border-obsidian-accent bg-obsidian-bg px-2 py-1.5 text-sm text-obsidian-text placeholder:text-obsidian-muted focus:outline-none"
          />
        )}
        {projects.length === 0 && !creating ? (
          <p className="px-2 py-1 text-xs text-obsidian-muted">No projects yet.</p>
        ) : (
          projects.map((p) => (
            <button
              key={p}
              onClick={() => onSelectProject(p)}
              aria-current={p === selectedProject}
              className={`block w-full truncate rounded px-2 py-1.5 text-left text-sm transition-colors ${
                p === selectedProject ? SELECTED : UNSELECTED
              }`}
            >
              {p}
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
