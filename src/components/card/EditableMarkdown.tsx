'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { slugify, nodeToText } from './markdown';

interface EditableMarkdownProps {
  value: string;
  onCommit: (next: string) => void;
  placeholder?: string;
  className?: string;
}

const headingId = (children: ReactNode) => slugify(nodeToText(children));

const mdComponents: Components = {
  h1: ({ children }) => <h2 id={headingId(children)}>{children}</h2>,
  h2: ({ children }) => <h2 id={headingId(children)}>{children}</h2>,
  h3: ({ children }) => <h3 id={headingId(children)}>{children}</h3>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
};

function autosize(el: HTMLTextAreaElement) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 2 + 'px';
}

/** Renders markdown; click to edit the raw source, blur to re-render and save. */
export function EditableMarkdown({ value, onCommit, placeholder, className }: EditableMarkdownProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      autosize(ref.current);
    }
  }, [editing]);

  function commit() {
    setEditing(false);
    if (draft !== value) onCommit(draft);
  }

  if (editing) {
    return (
      <textarea
        ref={ref}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          autosize(e.target);
        }}
        onBlur={commit}
        className="card-md-input"
        aria-label="Edit markdown"
      />
    );
  }

  const isEmpty = !value.trim();
  return (
    <div
      className={`card-prose card-editable ${className ?? ''}`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('a')) return;
        setEditing(true);
      }}
    >
      {isEmpty ? (
        <p className="text-obsidian-muted">{placeholder ?? 'Add text…'}</p>
      ) : (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
          {value}
        </ReactMarkdown>
      )}
    </div>
  );
}
