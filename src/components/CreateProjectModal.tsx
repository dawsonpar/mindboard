'use client';

import { useState, useEffect } from 'react';

interface CreateProjectModalProps {
  onClose: () => void;
  onCreate: (name: string) => void;
}

const inputClass =
  'w-full bg-obsidian-bg border border-obsidian-border rounded-input text-obsidian-text p-2 text-sm focus:outline-none focus:border-obsidian-accent';

export function CreateProjectModal({ onClose, onCreate }: CreateProjectModalProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      setError('Project name is required');
      return;
    }

    setError('');
    onCreate(name.trim());
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Create new project"
    >
      <form
        onSubmit={handleSubmit}
        className="bg-obsidian-panel border border-obsidian-border rounded-card w-full max-w-sm p-6"
      >
        <h2 className="text-base font-semibold text-obsidian-text mb-4">
          New Project
        </h2>

        <div>
          <label htmlFor="project-name" className="block text-xs text-obsidian-muted mb-1">
            Project Name
          </label>
          <input
            id="project-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            autoFocus
          />
          {error && (
            <p className="text-priority-p0 text-xs mt-1">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="bg-obsidian-card border border-obsidian-border text-obsidian-text px-4 py-2 rounded-input text-sm hover:border-obsidian-accent transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-obsidian-accent text-obsidian-text px-4 py-2 rounded-input text-sm hover:opacity-90 transition-opacity"
          >
            Create
          </button>
        </div>
      </form>
    </div>
  );
}
