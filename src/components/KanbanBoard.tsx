'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import type { Card, CardStatus } from '@/types/card';
import type { SortOption } from '@/types/sort';
import { KanbanColumn } from './KanbanColumn';
import { CardModal } from './CardModal';
import { Toast } from './Toast';
import { useSSE } from '@/hooks/useSSE';

interface KanbanBoardProps {
  project: string;
  sortBy: SortOption;
}

const COLUMN_ORDER: CardStatus[] = ['TODO', 'IN PROGRESS', 'REVIEW', 'COMPLETED'];
const UNCATEGORIZED = 'Uncategorized';

function sortCards(cards: Card[], sortBy: SortOption): Card[] {
  const sorted = [...cards];
  const priorityOrder: Record<string, number> = {
    P0: 0,
    P1: 1,
    P2: 2,
    P3: 3,
  };

  sorted.sort((a, b) => {
    switch (sortBy) {
      case 'priority': {
        const pa = a.priority ? priorityOrder[a.priority] : 999;
        const pb = b.priority ? priorityOrder[b.priority] : 999;
        return pa - pb;
      }
      case 'alpha':
        return a.title.localeCompare(b.title, undefined, {
          sensitivity: 'base',
        });
      case 'created':
        return (
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
        );
      case 'modified':
        return (
          new Date(b.modifiedAt).getTime() -
          new Date(a.modifiedAt).getTime()
        );
      default:
        return 0;
    }
  });

  return sorted;
}

function groupByStatus(
  cards: Card[]
): Record<string, Card[]> {
  const groups: Record<string, Card[]> = {};
  for (const col of COLUMN_ORDER) {
    groups[col] = [];
  }

  for (const card of cards) {
    const key = card.status ?? UNCATEGORIZED;
    if (!groups[key]) groups[key] = [];
    groups[key].push(card);
  }

  return groups;
}

export function KanbanBoard({ project, sortBy }: KanbanBoardProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [externalChange, setExternalChange] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'info' | 'error' | 'success';
  } | null>(null);

  const selectedCardRef = useRef<Card | null>(null);
  selectedCardRef.current = selectedCard;

  const fetchCards = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/cards?project=${encodeURIComponent(project)}`
      );
      const data = await res.json();
      const fetched: Card[] = data.cards ?? [];
      setCards(fetched);

      // Update selectedCard if it exists in the new data
      if (selectedCardRef.current) {
        const updated = fetched.find(
          (c) => c.filename === selectedCardRef.current?.filename
        );
        if (updated) {
          setSelectedCard(updated);
        }
      }
    } catch {
      setToast({ message: 'Failed to load cards', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [project]);

  useEffect(() => {
    setLoading(true);
    fetchCards();
  }, [fetchCards]);

  useSSE(
    useCallback(
      (event) => {
        if (event.project !== project) return;

        if (
          selectedCardRef.current &&
          selectedCardRef.current.filename === event.filename
        ) {
          setExternalChange(true);
          setToast({
            message: 'Card was modified externally',
            type: 'info',
          });
        }

        fetchCards();
      },
      [project, fetchCards]
    )
  );

  async function handleDragEnd(result: DropResult) {
    const { destination, draggableId } = result;
    if (!destination) return;

    const newStatus = destination.droppableId as CardStatus;
    const card = cards.find((c) => c.filename === draggableId);
    if (!card || card.status === newStatus) return;

    // Optimistic update
    setCards((prev) =>
      prev.map((c) =>
        c.filename === draggableId ? { ...c, status: newStatus } : c
      )
    );

    try {
      await fetch(
        `/api/cards/${encodeURIComponent(project)}/${encodeURIComponent(draggableId)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        }
      );
    } catch {
      setToast({ message: 'Failed to update card status', type: 'error' });
      fetchCards();
    }
  }

  async function handleCardSave(updates: Partial<Card>) {
    if (!selectedCard) return;

    try {
      const res = await fetch(
        `/api/cards/${encodeURIComponent(project)}/${encodeURIComponent(selectedCard.filename)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }
      );
      const updatedCard: Card = await res.json();

      setCards((prev) =>
        prev.map((c) =>
          c.filename === updatedCard.filename ? updatedCard : c
        )
      );
      setSelectedCard(updatedCard);
      setExternalChange(false);
    } catch {
      setToast({ message: 'Failed to save card', type: 'error' });
    }
  }

  const sorted = sortCards(cards, sortBy);
  const grouped = groupByStatus(sorted);
  const columnKeys = [...COLUMN_ORDER];

  if (grouped[UNCATEGORIZED]?.length > 0) {
    columnKeys.push(UNCATEGORIZED as CardStatus);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-obsidian-muted text-sm">
        Loading cards...
      </div>
    );
  }

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 p-4 overflow-x-auto h-[calc(100vh-56px)] justify-center">
          {columnKeys.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              cards={grouped[status] ?? []}
              onCardClick={setSelectedCard}
            />
          ))}
        </div>
      </DragDropContext>

      {selectedCard && (
        <CardModal
          card={selectedCard}
          onClose={() => {
            setSelectedCard(null);
            setExternalChange(false);
          }}
          onSave={handleCardSave}
          onExternalChange={externalChange}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  );
}
