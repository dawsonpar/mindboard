'use client';

import { useState } from 'react';
import type { Card, CardStatus, CardPriority } from '@/types/card';
import { Outline } from './Outline';
import { EditableTitle } from './EditableTitle';
import { EditableMarkdown } from './EditableMarkdown';
import { StatusChip, PriorityChip, ComplexityChip } from './Chips';
import { CollapsibleSection } from './CollapsibleSection';
import { TaskSection } from './TaskSection';
import { ReferenceSection } from './ReferenceSection';

interface CardArticleProps {
  card: Card;
  allCards: Card[];
  onSave: (updates: Partial<Card>) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function CardArticle({ card, allCards, onSave }: CardArticleProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    tasks: false,
    references: false,
    notes: false,
  });
  const toggle = (id: string) => setCollapsed((c) => ({ ...c, [id]: !c[id] }));
  const expand = (id: string) => setCollapsed((c) => ({ ...c, [id]: false }));

  const done = card.tasks.filter((t) => t.completed).length;

  return (
    <div className="card-shell">
      <Outline
        title={card.title}
        descriptionMd={card.description}
        backHref="/"
        backLabel={`Board / ${card.project}`}
        onExpand={expand}
      />

      <article className="card-article">
        <div className="card-eyebrow">
          <StatusChip value={card.status} onChange={(v: CardStatus) => onSave({ status: v })} />
          <PriorityChip value={card.priority} onChange={(v: CardPriority | null) => onSave({ priority: v })} />
          <ComplexityChip value={card.complexity} onChange={(v) => onSave({ complexity: v })} />
        </div>

        <EditableTitle value={card.title} onCommit={(v) => onSave({ title: v })} />

        <div className="card-byline">
          <span>Updated {formatDate(card.modifiedAt)}</span>
          <span>
            {done}/{card.tasks.length} tasks
          </span>
          <span>{card.references.length} references</span>
        </div>

        <div id="description">
          <EditableMarkdown
            value={card.description}
            placeholder="Add a description…"
            onCommit={(v) => onSave({ description: v })}
          />
        </div>

        <CollapsibleSection
          id="tasks"
          title="Tasks"
          meta={card.tasks.length ? `${done} of ${card.tasks.length}` : 'none'}
          collapsed={collapsed.tasks}
          onToggle={() => toggle('tasks')}
        >
          <TaskSection tasks={card.tasks} onChange={(tasks) => onSave({ tasks })} />
        </CollapsibleSection>

        <CollapsibleSection
          id="references"
          title="References"
          meta={card.references.length}
          collapsed={collapsed.references}
          onToggle={() => toggle('references')}
        >
          <ReferenceSection
            references={card.references}
            allCards={allCards}
            currentFilename={card.filename}
            onChange={(references) => onSave({ references })}
          />
        </CollapsibleSection>

        <CollapsibleSection
          id="notes"
          title="Notes"
          collapsed={collapsed.notes}
          onToggle={() => toggle('notes')}
        >
          <EditableMarkdown
            value={card.comments}
            placeholder="Add notes…"
            className="card-note"
            onCommit={(v) => onSave({ comments: v })}
          />
        </CollapsibleSection>
      </article>
    </div>
  );
}
