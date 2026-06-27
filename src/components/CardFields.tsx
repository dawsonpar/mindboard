'use client';

import { useState, useRef } from 'react';
import type { Card, CardStatus, CardPriority, Task } from '@/types/card';

const statuses: CardStatus[] = ['TODO', 'IN PROGRESS', 'REVIEW', 'COMPLETED'];
const priorities: (CardPriority | '')[] = ['', 'P0', 'P1', 'P2', 'P3'];
const complexityOptions = [1, 2, 3, 4, 5, 6, 7, 8];

const inputClass =
  'w-full bg-obsidian-bg border border-obsidian-border rounded-input text-obsidian-text p-2 text-sm focus:outline-none focus:border-obsidian-accent';

export interface CardFieldsProps {
  title: string;
  titleError: string;
  status: CardStatus | null;
  priority: CardPriority | null;
  complexity: number | null;
  description: string;
  comments: string;
  tasks: Task[];
  references: string[];
  allCards: Card[];
  currentFilename: string;
  absolutePath: string;
  readOnly?: boolean;
  onTitleChange: (v: string) => void;
  onTitleBlur: () => void;
  onStatusChange: (v: string) => void;
  onPriorityChange: (v: string) => void;
  onComplexityChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onDescriptionBlur: () => void;
  onCommentsChange: (v: string) => void;
  onCommentsBlur: () => void;
  onTaskToggle: (index: number) => void;
  onTaskAdd: (text: string) => void;
  onTaskRemove: (index: number) => void;
  onReferenceAdd: (filename: string) => void;
  onReferenceRemove: (filename: string) => void;
  onNavigate: (card: Card) => void;
}

export function CardFields({
  title,
  titleError,
  status,
  priority,
  complexity,
  description,
  comments,
  tasks,
  references,
  allCards,
  currentFilename,
  absolutePath,
  readOnly,
  onTitleChange,
  onTitleBlur,
  onStatusChange,
  onPriorityChange,
  onComplexityChange,
  onDescriptionChange,
  onDescriptionBlur,
  onCommentsChange,
  onCommentsBlur,
  onTaskToggle,
  onTaskAdd,
  onTaskRemove,
  onReferenceAdd,
  onReferenceRemove,
  onNavigate,
}: CardFieldsProps) {
  const [newTaskText, setNewTaskText] = useState('');
  const [refSearch, setRefSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [refDropdownOpen, setRefDropdownOpen] = useState(false);
  const refSearchRef = useRef<HTMLInputElement>(null);

  function handleCopyPath() {
    navigator.clipboard.writeText(absolutePath).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const refCandidates = allCards.filter(
    (c) => c.filename !== currentFilename && !references.includes(c.filename)
  );
  const filteredCandidates = refSearch.trim()
    ? refCandidates.filter((c) =>
        c.title.toLowerCase().includes(refSearch.toLowerCase())
      )
    : refCandidates;

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
          className={`${inputClass} disabled:opacity-60 disabled:cursor-default`}
          maxLength={72}
          disabled={readOnly}
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
            className={`${inputClass} disabled:opacity-60 disabled:cursor-default`}
            disabled={readOnly}
          >
            {status === null && (
              <option value="" disabled>
                -- Select status --
              </option>
            )}
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
            className={`${inputClass} disabled:opacity-60 disabled:cursor-default`}
            disabled={readOnly}
          >
            {priorities.map((p) => (
              <option key={p} value={p}>
                {p === '' ? 'Unset' : p}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor="card-complexity" className="block text-xs text-obsidian-muted mb-1">
            Complexity
          </label>
          <select
            id="card-complexity"
            value={complexity ?? ''}
            onChange={(e) => onComplexityChange(e.target.value)}
            className={`${inputClass} disabled:opacity-60 disabled:cursor-default`}
            disabled={readOnly}
          >
            <option value="">Unset</option>
            {complexityOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
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
          className={`${inputClass} resize-y disabled:opacity-60 disabled:cursor-default`}
          disabled={readOnly}
        />
      </div>

      {/* Tasks */}
      <div>
        <span className="block text-xs text-obsidian-muted mb-1">Tasks</span>
        {tasks.length > 0 && (
          <ul className="space-y-1 mb-2">
            {tasks.map((task, i) => (
              <li key={i} className="flex items-center gap-2 group">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => onTaskToggle(i)}
                  className="accent-obsidian-accent disabled:cursor-default"
                  aria-label={`Task: ${task.text}`}
                  disabled={readOnly}
                />
                <span
                  className={`text-sm flex-1 ${task.completed ? 'line-through text-obsidian-muted' : 'text-obsidian-text'}`}
                >
                  {task.text}
                </span>
                {!readOnly && (
                  <button
                    onClick={() => onTaskRemove(i)}
                    className="text-obsidian-muted hover:text-priority-p0 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                    aria-label={`Remove task: ${task.text}`}
                  >
                    &#x2715;
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {!readOnly && (
          <div className="flex gap-2">
            <input
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTaskText.trim()) {
                  e.preventDefault();
                  onTaskAdd(newTaskText.trim());
                  setNewTaskText('');
                }
              }}
              placeholder="Add a task..."
              className={`${inputClass} flex-1`}
            />
            <button
              type="button"
              onClick={() => {
                if (newTaskText.trim()) {
                  onTaskAdd(newTaskText.trim());
                  setNewTaskText('');
                }
              }}
              className="bg-obsidian-card border border-obsidian-border text-obsidian-muted px-3 py-2 rounded-input text-sm hover:border-obsidian-accent hover:text-obsidian-text transition-colors"
            >
              Add
            </button>
          </div>
        )}
      </div>

      {/* References */}
      <div>
        <span className="block text-xs text-obsidian-muted mb-1">References</span>
        {references.length > 0 && (
          <ul className="space-y-1 mb-2">
            {references.map((ref) => {
              const refCard = allCards.find((c) => c.filename === ref);
              return (
                <li key={ref} className="flex items-center gap-2 group">
                  <button
                    onClick={() => refCard && onNavigate(refCard)}
                    disabled={!refCard}
                    className="flex-1 text-left text-sm text-obsidian-text hover:text-obsidian-accent hover:underline disabled:text-obsidian-muted disabled:no-underline truncate transition-colors"
                    aria-label={`Open card: ${refCard?.title ?? ref}`}
                  >
                    {refCard?.title ?? ref}
                  </button>
                  {!readOnly && (
                    <button
                      onClick={() => onReferenceRemove(ref)}
                      className="text-obsidian-muted hover:text-priority-p0 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                      aria-label={`Remove reference: ${refCard?.title ?? ref}`}
                    >
                      &#x2715;
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {!readOnly && (
          <div className="relative">
            <input
              ref={refSearchRef}
              type="text"
              value={refSearch}
              onChange={(e) => {
                setRefSearch(e.target.value);
                setRefDropdownOpen(true);
              }}
              onFocus={() => setRefDropdownOpen(true)}
              onBlur={() => setTimeout(() => setRefDropdownOpen(false), 150)}
              placeholder="Link a card..."
              className={`${inputClass} w-full`}
            />
            {refDropdownOpen && filteredCandidates.length > 0 && (
              <ul className="absolute z-50 w-full mt-1 bg-obsidian-panel border border-obsidian-border rounded-input max-h-40 overflow-y-auto">
                {filteredCandidates.map((c) => (
                  <li key={c.filename}>
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onReferenceAdd(c.filename);
                        setRefSearch('');
                        setRefDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-sm text-obsidian-text hover:bg-obsidian-card truncate"
                    >
                      {c.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

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
          className={`${inputClass} resize-y disabled:opacity-60 disabled:cursor-default`}
          disabled={readOnly}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleCopyPath}
          className="bg-obsidian-card border border-obsidian-border text-obsidian-text px-4 py-2 rounded-input text-sm hover:border-obsidian-accent transition-colors"
        >
          {copied ? 'Copied!' : 'Copy Path'}
        </button>
      </div>
    </div>
  );
}
