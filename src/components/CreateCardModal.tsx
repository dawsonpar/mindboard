'use client';

import { useState, useEffect } from 'react';
import type { CardStatus, CardPriority } from '@/types/card';

interface CreateCardModalProps {
  onClose: () => void;
  onCreate: (data: {
    title: string;
    status?: CardStatus;
    priority?: CardPriority;
    description?: string;
  }) => void;
}

const statuses: CardStatus[] = ['TODO', 'IN PROGRESS', 'REVIEW', 'COMPLETED'];
const priorities: (CardPriority | '')[] = ['', 'P0', 'P1', 'P2', 'P3'];

const inputClass =
  'w-full bg-obsidian-bg border border-obsidian-border rounded-input text-obsidian-text p-2 text-sm focus:outline-none focus:border-obsidian-accent';

export function CreateCardModal({ onClose, onCreate }: CreateCardModalProps) {
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<CardStatus>('TODO');
  const [priority, setPriority] = useState<CardPriority | ''>('');
  const [description, setDescription] = useState('');
  const [titleError, setTitleError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      setTitleError('Title is required');
      return;
    }
    if (title.length > 72) {
      setTitleError('Title must be 72 characters or fewer');
      return;
    }

    setTitleError('');
    onCreate({
      title: title.trim(),
      status,
      priority: priority || undefined,
      description: description.trim() || undefined,
    });
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
      aria-label="Create new card"
    >
      <form
        onSubmit={handleSubmit}
        className="bg-obsidian-panel border border-obsidian-border rounded-card w-full max-w-md p-6"
      >
        <h2 className="text-base font-semibold text-obsidian-text mb-4">
          New Card
        </h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="new-card-title" className="block text-xs text-obsidian-muted mb-1">
              Title
            </label>
            <input
              id="new-card-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              maxLength={72}
              autoFocus
            />
            {titleError && (
              <p className="text-priority-p0 text-xs mt-1">{titleError}</p>
            )}
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label htmlFor="new-card-status" className="block text-xs text-obsidian-muted mb-1">
                Status
              </label>
              <select
                id="new-card-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as CardStatus)}
                className={inputClass}
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label htmlFor="new-card-priority" className="block text-xs text-obsidian-muted mb-1">
                Priority
              </label>
              <select
                id="new-card-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as CardPriority | '')}
                className={inputClass}
              >
                {priorities.map((p) => (
                  <option key={p} value={p}>
                    {p === '' ? 'None' : p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="new-card-desc" className="block text-xs text-obsidian-muted mb-1">
              Description
            </label>
            <textarea
              id="new-card-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={`${inputClass} resize-y`}
            />
          </div>
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
