'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Card, CardStatus, CardPriority, Task } from '@/types/card';

interface CardModalProps {
  card: Card;
  onClose: () => void;
  onSave: (updates: Partial<Card>) => void;
  onExternalChange?: boolean;
}

const statuses: CardStatus[] = ['TODO', 'IN PROGRESS', 'REVIEW', 'COMPLETED'];
const priorities: (CardPriority | '')[] = ['', 'P0', 'P1', 'P2', 'P3'];

const inputClass =
  'w-full bg-obsidian-bg border border-obsidian-border rounded-input text-obsidian-text p-2 text-sm focus:outline-none focus:border-obsidian-accent';

export function CardModal({ card, onClose, onSave, onExternalChange }: CardModalProps) {
  const [title, setTitle] = useState(card.title);
  const [status, setStatus] = useState<CardStatus | null>(card.status);
  const [priority, setPriority] = useState<CardPriority | null>(card.priority);
  const [description, setDescription] = useState(card.description);
  const [tasks, setTasks] = useState<Task[]>(card.tasks);
  const [comments, setComments] = useState(card.comments);
  const [titleError, setTitleError] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<Partial<Card>>({});

  // Sync from parent when card prop changes (SSE update)
  useEffect(() => {
    setTitle(card.title);
    setStatus(card.status);
    setPriority(card.priority);
    setDescription(card.description);
    setTasks(card.tasks);
    setComments(card.comments);
  }, [card]);

  const flushSave = useCallback(() => {
    if (Object.keys(pendingRef.current).length > 0) {
      onSave({ ...pendingRef.current });
      pendingRef.current = {};
    }
  }, [onSave]);

  const scheduleSave = useCallback(
    (updates: Partial<Card>) => {
      pendingRef.current = { ...pendingRef.current, ...updates };
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(flushSave, 800);
    },
    [flushSave]
  );

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      flushSave();
    };
  }, [flushSave]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function validateTitle(value: string): boolean {
    if (!value.trim()) {
      setTitleError('Title is required');
      return false;
    }
    if (value.length > 72) {
      setTitleError('Title must be 72 characters or fewer');
      return false;
    }
    setTitleError('');
    return true;
  }

  function handleTitleBlur() {
    if (validateTitle(title) && title !== card.title) {
      scheduleSave({ title });
    }
  }

  function handleStatusChange(value: string) {
    const newStatus = value as CardStatus;
    setStatus(newStatus);
    scheduleSave({ status: newStatus });
  }

  function handlePriorityChange(value: string) {
    const newPriority = value === '' ? null : (value as CardPriority);
    setPriority(newPriority);
    scheduleSave({ priority: newPriority });
  }

  function handleDescriptionBlur() {
    if (description !== card.description) {
      scheduleSave({ description });
    }
  }

  function handleCommentsBlur() {
    if (comments !== card.comments) {
      scheduleSave({ comments });
    }
  }

  function handleTaskToggle(index: number) {
    const updated = tasks.map((t, i) =>
      i === index ? { ...t, completed: !t.completed } : t
    );
    setTasks(updated);
    scheduleSave({ tasks: updated });
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={`Edit card: ${card.title}`}
    >
      <div className="bg-obsidian-panel border border-obsidian-border rounded-card w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-obsidian-text">
            Edit Card
          </h2>
          <button
            onClick={onClose}
            className="text-obsidian-muted hover:text-obsidian-text"
            aria-label="Close modal"
          >
            &#x2715;
          </button>
        </div>

        {onExternalChange && (
          <div className="bg-obsidian-bg border border-priority-p2 rounded-input p-2 mb-4 text-xs text-priority-p2">
            This card was modified externally. Fields have been updated.
          </div>
        )}

        {card.hasErrors && card.errorMessages.length > 0 && (
          <div className="bg-obsidian-bg border border-priority-p0 rounded-input p-2 mb-4 text-xs text-priority-p0">
            {card.errorMessages.map((msg, i) => (
              <p key={i}>{msg}</p>
            ))}
          </div>
        )}

        <CardModalFields
          title={title}
          titleError={titleError}
          status={status}
          priority={priority}
          description={description}
          comments={comments}
          tasks={tasks}
          absolutePath={card.absolutePath}
          onTitleChange={setTitle}
          onTitleBlur={handleTitleBlur}
          onStatusChange={handleStatusChange}
          onPriorityChange={handlePriorityChange}
          onDescriptionChange={setDescription}
          onDescriptionBlur={handleDescriptionBlur}
          onCommentsChange={setComments}
          onCommentsBlur={handleCommentsBlur}
          onTaskToggle={handleTaskToggle}
        />
      </div>
    </div>
  );
}

interface CardModalFieldsProps {
  title: string;
  titleError: string;
  status: CardStatus | null;
  priority: CardPriority | null;
  description: string;
  comments: string;
  tasks: Task[];
  absolutePath: string;
  onTitleChange: (v: string) => void;
  onTitleBlur: () => void;
  onStatusChange: (v: string) => void;
  onPriorityChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onDescriptionBlur: () => void;
  onCommentsChange: (v: string) => void;
  onCommentsBlur: () => void;
  onTaskToggle: (index: number) => void;
}

function CardModalFields({
  title,
  titleError,
  status,
  priority,
  description,
  comments,
  tasks,
  absolutePath,
  onTitleChange,
  onTitleBlur,
  onStatusChange,
  onPriorityChange,
  onDescriptionChange,
  onDescriptionBlur,
  onCommentsChange,
  onCommentsBlur,
  onTaskToggle,
}: CardModalFieldsProps) {
  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <label htmlFor="card-title" className="block text-xs text-obsidian-muted mb-1">
          Title
        </label>
        <input
          id="card-title"
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          onBlur={onTitleBlur}
          className={inputClass}
          maxLength={72}
        />
        {titleError && (
          <p className="text-priority-p0 text-xs mt-1">{titleError}</p>
        )}
      </div>

      {/* Status & Priority */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label htmlFor="card-status" className="block text-xs text-obsidian-muted mb-1">
            Status
          </label>
          <select
            id="card-status"
            value={status ?? ''}
            onChange={(e) => onStatusChange(e.target.value)}
            className={inputClass}
          >
            {statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor="card-priority" className="block text-xs text-obsidian-muted mb-1">
            Priority
          </label>
          <select
            id="card-priority"
            value={priority ?? ''}
            onChange={(e) => onPriorityChange(e.target.value)}
            className={inputClass}
          >
            {priorities.map((p) => (
              <option key={p} value={p}>
                {p === '' ? 'Unset' : p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="card-description" className="block text-xs text-obsidian-muted mb-1">
          Description
        </label>
        <textarea
          id="card-description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          onBlur={onDescriptionBlur}
          rows={4}
          className={`${inputClass} resize-y`}
        />
      </div>

      {/* Tasks */}
      {tasks.length > 0 && (
        <div>
          <span className="block text-xs text-obsidian-muted mb-1">Tasks</span>
          <ul className="space-y-1">
            {tasks.map((task, i) => (
              <li key={i} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => onTaskToggle(i)}
                  className="accent-obsidian-accent"
                  aria-label={`Task: ${task.text}`}
                />
                <span
                  className={`text-sm ${task.completed ? 'line-through text-obsidian-muted' : 'text-obsidian-text'}`}
                >
                  {task.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Comments */}
      <div>
        <label htmlFor="card-comments" className="block text-xs text-obsidian-muted mb-1">
          Comments
        </label>
        <textarea
          id="card-comments"
          value={comments}
          onChange={(e) => onCommentsChange(e.target.value)}
          onBlur={onCommentsBlur}
          rows={3}
          className={`${inputClass} resize-y`}
        />
      </div>

      {/* Open in Obsidian */}
      <button
        onClick={() =>
          window.open(
            `obsidian://open?path=${encodeURIComponent(absolutePath)}`
          )
        }
        className="bg-obsidian-card border border-obsidian-border text-obsidian-text px-4 py-2 rounded-input text-sm hover:border-obsidian-accent transition-colors"
      >
        Open in Obsidian
      </button>
    </div>
  );
}
