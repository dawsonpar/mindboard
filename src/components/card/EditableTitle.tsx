'use client';

import { useEffect, useRef, useState } from 'react';

interface EditableTitleProps {
  value: string;
  onCommit: (next: string) => void;
}

/** The card title. Click to edit inline; Enter or blur saves, Escape cancels. */
export function EditableTitle({ value, onCommit }: EditableTitleProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      ref.current.select();
    }
  }, [editing]);

  function commit() {
    setEditing(false);
    const next = draft.trim();
    if (next && next !== value) onCommit(next);
    else setDraft(value);
  }

  if (editing) {
    return (
      <input
        ref={ref}
        value={draft}
        maxLength={72}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.currentTarget.blur();
          } else if (e.key === 'Escape') {
            setDraft(value);
            setEditing(false);
          }
        }}
        className="card-title-input"
        aria-label="Edit title"
      />
    );
  }

  return (
    <h1 id="title" className="card-title card-editable" onClick={() => setEditing(true)}>
      {value}
    </h1>
  );
}
