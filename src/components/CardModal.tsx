'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Card, CardStatus, CardPriority, Task } from '@/types/card';
import { CardFields } from './CardFields';

interface CardModalProps {
  card: Card;
  allCards: Card[];
  onClose: () => void;
  onSave: (updates: Partial<Card>) => void;
  onNavigate: (card: Card) => void;
  onExternalChange?: boolean;
  readOnly?: boolean;
  onRestore?: () => void;
}

export function CardModal({ card, allCards, onClose, onSave, onNavigate, onExternalChange, readOnly, onRestore }: CardModalProps) {
  const [title, setTitle] = useState(card.title);
  const [status, setStatus] = useState<CardStatus | null>(card.status);
  const [priority, setPriority] = useState<CardPriority | null>(card.priority);
  const [complexity, setComplexity] = useState<number | null>(card.complexity);
  const [description, setDescription] = useState(card.description);
  const [tasks, setTasks] = useState<Task[]>(card.tasks);
  const [references, setReferences] = useState<string[]>(card.references);
  const [comments, setComments] = useState(card.comments);
  const [titleError, setTitleError] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<Partial<Card>>({});

  // Sync from parent when card prop changes (SSE update)
  useEffect(() => {
    setTitle(card.title);
    setStatus(card.status);
    setPriority(card.priority);
    setComplexity(card.complexity);
    setDescription(card.description);
    setTasks(card.tasks);
    setReferences(card.references);
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

  // Flush on unmount (skip when read-only — no saves should happen)
  useEffect(() => {
    if (readOnly) return;
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      flushSave();
    };
  }, [flushSave, readOnly]);

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

  function handleComplexityChange(value: string) {
    const newComplexity = value === '' ? null : Number(value);
    setComplexity(newComplexity);
    scheduleSave({ complexity: newComplexity });
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

  function handleTaskAdd(text: string) {
    const updated = [...tasks, { text, completed: false }];
    setTasks(updated);
    scheduleSave({ tasks: updated });
  }

  function handleTaskRemove(index: number) {
    const updated = tasks.filter((_, i) => i !== index);
    setTasks(updated);
    scheduleSave({ tasks: updated });
  }

  function handleReferenceAdd(filename: string) {
    if (references.includes(filename)) return;
    const updated = [...references, filename];
    setReferences(updated);
    scheduleSave({ references: updated });
  }

  function handleReferenceRemove(filename: string) {
    const updated = references.filter((r) => r !== filename);
    setReferences(updated);
    scheduleSave({ references: updated });
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
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-obsidian-text">
              {readOnly ? 'Archived Card' : 'Edit Card'}
            </h2>
            {readOnly && (
              <span className="text-[10px] text-obsidian-muted border border-obsidian-border px-1.5 py-0.5 rounded-full">
                read-only
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {readOnly && onRestore && (
              <button
                onClick={onRestore}
                className="text-xs text-obsidian-accent border border-obsidian-accent rounded px-2.5 py-1 hover:bg-obsidian-accent hover:text-obsidian-bg transition-colors"
              >
                Restore
              </button>
            )}
            <button
              onClick={onClose}
              className="text-obsidian-muted hover:text-obsidian-text"
              aria-label="Close modal"
            >
              &#x2715;
            </button>
          </div>
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

        <CardFields
          title={title}
          titleError={titleError}
          status={status}
          priority={priority}
          complexity={complexity}
          description={description}
          comments={comments}
          tasks={tasks}
          references={references}
          allCards={allCards}
          currentFilename={card.filename}
          absolutePath={card.absolutePath}
          readOnly={readOnly}
          onTitleChange={setTitle}
          onTitleBlur={handleTitleBlur}
          onStatusChange={handleStatusChange}
          onPriorityChange={handlePriorityChange}
          onComplexityChange={handleComplexityChange}
          onDescriptionChange={setDescription}
          onDescriptionBlur={handleDescriptionBlur}
          onCommentsChange={setComments}
          onCommentsBlur={handleCommentsBlur}
          onTaskToggle={handleTaskToggle}
          onTaskAdd={handleTaskAdd}
          onTaskRemove={handleTaskRemove}
          onReferenceAdd={handleReferenceAdd}
          onReferenceRemove={handleReferenceRemove}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
}
