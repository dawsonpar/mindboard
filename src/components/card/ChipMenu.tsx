'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

export interface ChipMenuItem {
  value: string;
  node: ReactNode;
}

interface ChipMenuProps {
  children: ReactNode;
  items: ChipMenuItem[];
  onSelect: (value: string) => void;
  ariaLabel: string;
}

/** A clickable chip that opens a small dropdown of options. */
export function ChipMenu({ children, items, onSelect, ariaLabel }: ChipMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative inline-flex">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="cursor-pointer"
      >
        {children}
      </button>
      {open && (
        <div className="card-popover" role="menu">
          {items.map((it) => (
            <button
              key={it.value}
              type="button"
              role="menuitem"
              className="card-pop-item"
              onClick={() => {
                onSelect(it.value);
                setOpen(false);
              }}
            >
              {it.node}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
