'use client';

import { useEffect, useRef, useState } from 'react';

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

interface InlineAddProps {
  label: string;
  placeholder: string;
  onAdd: (value: string) => void;
  variant?: 'task' | 'default';
}

/** Sidebar-style add control: a plus icon + label that swaps to an inline input. */
export function InlineAdd({ label, placeholder, onAdd, variant = 'default' }: InlineAddProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  const cancel = useRef(false);

  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);

  function commit() {
    if (!cancel.current) {
      const v = value.trim();
      if (v) onAdd(v);
    }
    cancel.current = false;
    setValue('');
    setOpen(false);
  }

  if (open) {
    return (
      <input
        ref={ref}
        value={value}
        placeholder={placeholder}
        className="card-add-input"
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            ref.current?.blur();
          } else if (e.key === 'Escape') {
            cancel.current = true;
            ref.current?.blur();
          }
        }}
      />
    );
  }

  return (
    <button
      type="button"
      className={`card-add ${variant === 'task' ? 'card-add--task' : ''}`}
      onClick={() => {
        setValue('');
        setOpen(true);
      }}
    >
      <PlusIcon />
      {label}
    </button>
  );
}
