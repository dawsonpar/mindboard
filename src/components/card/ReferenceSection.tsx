'use client';

import Link from 'next/link';
import type { Card } from '@/types/card';
import { InlineAdd } from './InlineAdd';

interface ReferenceSectionProps {
  references: string[];
  allCards: Card[];
  currentFilename: string;
  onChange: (references: string[]) => void;
}

type Resolved =
  | { kind: 'card'; title: string; sub: string; href: string }
  | { kind: 'link'; title: string; sub: string; href: string }
  | { kind: 'text'; title: string; sub: string };

function resolve(ref: string, allCards: Card[]): Resolved {
  const card = allCards.find((c) => c.filename === ref);
  if (card) {
    return {
      kind: 'card',
      title: card.title,
      sub: `${card.project} · linked card`,
      href: `/card/${encodeURIComponent(card.project)}/${encodeURIComponent(card.filename)}`,
    };
  }
  const m = /^(\S+)\s*(?:\((.+)\))?\s*$/.exec(ref.trim());
  const urlPart = m ? m[1] : ref;
  const desc = m && m[2] ? m[2] : '';
  if (/^https?:\/\//i.test(urlPart)) {
    const host = urlPart.replace(/^https?:\/\//, '').replace(/\/$/, '').split('/')[0];
    return { kind: 'link', title: desc || host, sub: host, href: urlPart };
  }
  return { kind: 'text', title: ref, sub: '' };
}

function RefRow({ resolved, onRemove }: { resolved: Resolved; onRemove: () => void }) {
  const icon = resolved.kind === 'card' ? '▢' : '↗';
  const tag = resolved.kind === 'card' ? 'card' : 'link';
  const inner = (
    <>
      <span className="card-ricon">{icon}</span>
      <span>
        <span className="card-rtitle block">{resolved.title}</span>
        {resolved.sub && <span className="card-rsub block">{resolved.sub}</span>}
      </span>
      {resolved.kind !== 'text' && <span className="card-reftag">{tag}</span>}
      <button
        type="button"
        className="card-ref-rm"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove();
        }}
        aria-label="Remove reference"
      >
        ✕
      </button>
    </>
  );

  if (resolved.kind === 'card') {
    return (
      <Link href={resolved.href} className="card-refrow">
        {inner}
      </Link>
    );
  }
  if (resolved.kind === 'link') {
    return (
      <a href={resolved.href} target="_blank" rel="noreferrer" className="card-refrow">
        {inner}
      </a>
    );
  }
  return <div className="card-refrow">{inner}</div>;
}

export function ReferenceSection({ references, allCards, currentFilename, onChange }: ReferenceSectionProps) {
  function handleAdd(value: string) {
    // If it matches another card's title, link that card by filename; else store raw.
    const match = allCards.find(
      (c) => c.filename !== currentFilename && c.title.toLowerCase() === value.toLowerCase(),
    );
    const entry = match ? match.filename : value;
    if (references.includes(entry)) return;
    onChange([...references, entry]);
  }

  return (
    <>
      {references.length > 0 && (
        <div className="card-reflist">
          {references.map((ref) => (
            <RefRow
              key={ref}
              resolved={resolve(ref, allCards)}
              onRemove={() => onChange(references.filter((r) => r !== ref))}
            />
          ))}
        </div>
      )}
      <InlineAdd label="Add a reference" placeholder="Card title, or paste a URL" onAdd={handleAdd} />
    </>
  );
}
