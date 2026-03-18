'use client';

import { Droppable } from '@hello-pangea/dnd';
import type { Card } from '@/types/card';
import { KanbanCard } from './KanbanCard';

interface KanbanColumnProps {
  status: string;
  cards: Card[];
  onCardClick: (card: Card) => void;
  droppedFilename?: string | null;
  onArchive?: (filename: string) => void;
}

export function KanbanColumn({ status, cards, onCardClick, droppedFilename, onArchive }: KanbanColumnProps) {
  return (
    <div className="bg-obsidian-panel rounded-card flex flex-col min-w-[280px] w-[280px] max-h-full">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-obsidian-border">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-obsidian-muted">
          {status}
        </h2>
        <span className="text-[10px] text-obsidian-muted bg-obsidian-bg px-1.5 py-0.5 rounded-full">
          {cards.length}
        </span>
      </div>

      <Droppable droppableId={status}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex-1 overflow-y-auto p-2 min-h-[120px]"
          >
            {cards.map((card, index) => (
              <KanbanCard
                key={card.filename}
                card={card}
                index={index}
                onCardClick={onCardClick}
                onArchive={onArchive}
                isJustDropped={droppedFilename === card.filename}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
