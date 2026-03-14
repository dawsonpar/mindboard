'use client';

import { Draggable } from '@hello-pangea/dnd';
import type { Card } from '@/types/card';

interface KanbanCardProps {
  card: Card;
  index: number;
  onCardClick: (card: Card) => void;
}

const priorityColors: Record<string, string> = {
  P0: 'bg-priority-p0',
  P1: 'bg-priority-p1',
  P2: 'bg-priority-p2',
  P3: 'bg-priority-p3',
};

export function KanbanCard({ card, index, onCardClick }: KanbanCardProps) {
  const completedTasks = card.tasks.filter((t) => t.completed).length;
  const totalTasks = card.tasks.length;
  const progressPct = totalTasks > 0
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0;

  return (
    <Draggable draggableId={card.filename} index={index}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onCardClick(card)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onCardClick(card);
            }
          }}
          className="bg-obsidian-card border border-obsidian-border rounded-card p-3 mb-2 cursor-pointer hover:border-obsidian-accent transition-colors"
          role="button"
          tabIndex={0}
          aria-label={`Card: ${card.title}`}
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm text-obsidian-text truncate block flex-1">
              {card.title}
            </span>
            {card.hasErrors && (
              <span
                className="text-priority-p1 shrink-0"
                title={card.errorMessages.join(', ')}
                aria-label="Card has errors"
              >
                &#x26A0;
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2">
            {card.priority && (
              <span
                className={`${priorityColors[card.priority]} text-obsidian-bg text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none`}
              >
                {card.priority}
              </span>
            )}
            {totalTasks > 0 && (
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <div className="flex-1 h-1 bg-obsidian-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-obsidian-accent rounded-full transition-[width] duration-200"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <span className="text-[10px] text-obsidian-muted shrink-0">
                  {completedTasks}/{totalTasks}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}
