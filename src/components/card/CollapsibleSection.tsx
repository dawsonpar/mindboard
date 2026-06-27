'use client';

import type { ReactNode } from 'react';

function Chevron() {
  return (
    <svg className="card-chev" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface CollapsibleSectionProps {
  id: string;
  title: string;
  meta?: ReactNode;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function CollapsibleSection({ id, title, meta, collapsed, onToggle, children }: CollapsibleSectionProps) {
  return (
    <section id={id} className={`card-sec ${collapsed ? 'collapsed' : ''}`}>
      <button type="button" className="card-sec-head" onClick={onToggle} aria-expanded={!collapsed}>
        <Chevron />
        <span className="card-sec-name">{title}</span>
        {meta != null && <span className="card-sec-meta">{meta}</span>}
      </button>
      {!collapsed && <div className="card-sec-body">{children}</div>}
    </section>
  );
}
