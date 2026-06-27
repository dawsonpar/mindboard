'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { extractHeadings } from './markdown';

interface OutlineProps {
  title: string;
  descriptionMd: string;
  backHref: string;
  backLabel: string;
  onExpand: (sectionId: string) => void;
}

const SECTION_IDS = ['tasks', 'references', 'notes'];

function ToggleChevron() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Outline({ title, descriptionMd, backHref, backLabel, onExpand }: OutlineProps) {
  const [active, setActive] = useState('title');
  // Mobile-only disclosure for the table of contents.
  const [tocOpen, setTocOpen] = useState(false);

  const items = [
    { id: 'title', label: title, lvl: 0 },
    { id: 'description', label: 'Description', lvl: 0 },
    ...extractHeadings(descriptionMd).map((h) => ({ id: h.id, label: h.text, lvl: h.level })),
    { id: 'tasks', label: 'Tasks', lvl: 0 },
    { id: 'references', label: 'References', lvl: 0 },
    { id: 'notes', label: 'Notes', lvl: 0 },
  ];

  useEffect(() => {
    const ids = items.map((i) => i.id);
    const els = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el != null);
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: '0px 0px -75% 0px', threshold: 0 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
    // Rebuild when headings or title change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [descriptionMd, title]);

  function jump(e: React.MouseEvent, id: string) {
    e.preventDefault();
    if (SECTION_IDS.includes(id)) onExpand(id);
    setTocOpen(false); // collapse the mobile disclosure after navigating
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  return (
    <nav className="card-outline" aria-label="On this page">
      <Link href={backHref} className="card-back">
        ← {backLabel}
      </Link>
      <button
        type="button"
        className="card-toc-toggle"
        aria-expanded={tocOpen}
        onClick={() => setTocOpen((o) => !o)}
      >
        <ToggleChevron />
        On this page
      </button>
      <ul className={`card-toc ${tocOpen ? 'open' : ''}`}>
        {items.map((it) => (
          <li key={it.id}>
            <a
              href={`#${it.id}`}
              className={[
                it.lvl === 1 ? 'lvl2' : it.lvl === 2 ? 'lvl3' : '',
                active === it.id ? 'active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={(e) => jump(e, it.id)}
            >
              {it.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
