"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import type { Card, CardStatus } from "@/types/card";
import type { SortOption } from "@/types/sort";
import { KanbanColumn } from "./KanbanColumn";
import { CardModal } from "./CardModal";
import { Toast } from "./Toast";
import { useSSE } from "@/hooks/useSSE";

interface KanbanBoardProps {
  project: string;
  sortBy: SortOption;
}

const COLUMN_ORDER: CardStatus[] = [
  "TODO",
  "IN PROGRESS",
  "REVIEW",
  "COMPLETED",
];
const UNCATEGORIZED = "Uncategorized";

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
      case "priority": {
        const pa = a.priority ? priorityOrder[a.priority] : 999;
        const pb = b.priority ? priorityOrder[b.priority] : 999;
        return pa - pb;
      }
      case "alpha":
        return a.title.localeCompare(b.title, undefined, {
          sensitivity: "base",
        });
      case "created":
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case "modified":
        return (
          new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
        );
      default:
        return 0;
    }
  });

  return sorted;
}

function groupByStatus(cards: Card[]): Record<string, Card[]> {
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
  const [droppedFilename, setDroppedFilename] = useState<string | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [archivedCards, setArchivedCards] = useState<Card[]>([]);
  const [selectedArchivedCard, setSelectedArchivedCard] = useState<Card | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "info" | "error" | "success";
  } | null>(null);

  const selectedCardRef = useRef<Card | null>(null);
  selectedCardRef.current = selectedCard;

  const recentAppWritesRef = useRef<Set<string>>(new Set());

  function markAppWrite(filename: string) {
    recentAppWritesRef.current.add(filename);
    setTimeout(() => {
      recentAppWritesRef.current.delete(filename);
    }, 2000);
  }

  const fetchCards = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/cards?project=${encodeURIComponent(project)}`,
      );
      const data = await res.json();
      const fetched: Card[] = data.cards ?? [];
      setCards(fetched);
    } catch {
      setToast({ message: "Failed to load cards", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [project]);

  const fetchArchivedCards = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/cards?project=${encodeURIComponent(project)}&archived=true`,
      );
      const data = await res.json();
      setArchivedCards(data.cards ?? []);
    } catch {
      setToast({ message: "Failed to load archive", type: "error" });
    }
  }, [project]);

  const fetchAndSyncSelected = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/cards?project=${encodeURIComponent(project)}`,
      );
      const data = await res.json();
      const fetched: Card[] = data.cards ?? [];
      setCards(fetched);

      if (selectedCardRef.current) {
        const updated = fetched.find(
          (c) => c.filename === selectedCardRef.current?.filename,
        );
        if (updated) {
          setSelectedCard(updated);
        }
      }
    } catch {
      setToast({ message: "Failed to load cards", type: "error" });
    }
  }, [project]);

  useEffect(() => {
    setLoading(true);
    fetchCards();
  }, [fetchCards]);

  useEffect(() => {
    if (showArchive) {
      fetchArchivedCards();
    }
  }, [showArchive, fetchArchivedCards]);

  useSSE(
    useCallback(
      (event) => {
        if (event.project !== project) return;

        if (recentAppWritesRef.current.has(event.filename)) {
          fetchCards();
          return;
        }

        if (
          selectedCardRef.current &&
          selectedCardRef.current.filename === event.filename
        ) {
          setExternalChange(true);
          setToast({
            message: "Card was modified externally",
            type: "info",
          });
          fetchAndSyncSelected();
        } else {
          fetchCards();
        }
      },
      [project, fetchCards, fetchAndSyncSelected],
    ),
  );

  async function handleDragEnd(result: DropResult) {
    const { destination, draggableId } = result;
    if (!destination) return;

    const newStatus = destination.droppableId as CardStatus;
    const card = cards.find((c) => c.filename === draggableId);
    if (!card || card.status === newStatus) return;

    setCards((prev) =>
      prev.map((c) =>
        c.filename === draggableId ? { ...c, status: newStatus } : c,
      ),
    );

    setTimeout(() => {
      setDroppedFilename(draggableId);
      setTimeout(() => setDroppedFilename(null), 450);
    }, 5);

    markAppWrite(draggableId);

    try {
      await fetch(
        `/api/cards/${encodeURIComponent(project)}/${encodeURIComponent(draggableId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        },
      );
    } catch {
      setToast({ message: "Failed to update card status", type: "error" });
      fetchCards();
    }
  }

  async function handleCardSave(updates: Partial<Card>) {
    if (!selectedCard) return;

    markAppWrite(selectedCard.filename);

    try {
      const res = await fetch(
        `/api/cards/${encodeURIComponent(project)}/${encodeURIComponent(selectedCard.filename)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        },
      );
      const updatedCard: Card = await res.json();

      setCards((prev) =>
        prev.map((c) =>
          c.filename === updatedCard.filename ? updatedCard : c,
        ),
      );
      setSelectedCard(updatedCard);
      setExternalChange(false);
    } catch {
      setToast({ message: "Failed to save card", type: "error" });
    }
  }

  async function handleArchive(filename: string) {
    markAppWrite(filename);
    try {
      const res = await fetch(
        `/api/cards/${encodeURIComponent(project)}/${encodeURIComponent(filename)}/archive`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) },
      );
      if (!res.ok) {
        const err = await res.json();
        setToast({ message: err.error ?? "Failed to archive card", type: "error" });
        return;
      }
      setCards((prev) => prev.filter((c) => c.filename !== filename));
      if (showArchive) fetchArchivedCards();
      setToast({ message: "Card archived", type: "success" });
    } catch {
      setToast({ message: "Failed to archive card", type: "error" });
    }
  }

  async function handleUnarchive(filename: string) {
    markAppWrite(filename);
    try {
      const res = await fetch(
        `/api/cards/${encodeURIComponent(project)}/${encodeURIComponent(filename)}/archive`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ restore: true }),
        },
      );
      if (!res.ok) {
        const err = await res.json();
        setToast({ message: err.error ?? "Failed to unarchive card", type: "error" });
        return;
      }
      setArchivedCards((prev) => prev.filter((c) => c.filename !== filename));
      fetchCards();
      setToast({ message: "Card restored", type: "success" });
    } catch {
      setToast({ message: "Failed to unarchive card", type: "error" });
    }
  }

  async function handleBulkArchive() {
    try {
      const res = await fetch(
        `/api/cards/${encodeURIComponent(project)}/archive`,
        { method: "POST" },
      );
      if (!res.ok) {
        setToast({ message: "Failed to archive completed cards", type: "error" });
        return;
      }
      const data = await res.json();
      const count: number = data.archived?.length ?? 0;
      await fetchCards();
      if (showArchive) fetchArchivedCards();
      setToast({
        message: count > 0 ? `Archived ${count} completed card${count !== 1 ? "s" : ""}` : "No completed cards to archive",
        type: count > 0 ? "success" : "info",
      });
    } catch {
      setToast({ message: "Failed to archive completed cards", type: "error" });
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
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-obsidian-border shrink-0">
        <button
          onClick={handleBulkArchive}
          className="text-xs text-obsidian-muted hover:text-obsidian-text border border-obsidian-border hover:border-obsidian-accent rounded px-2.5 py-1 transition-colors"
        >
          Archive completed
        </button>
        <button
          onClick={() => setShowArchive((v) => !v)}
          className={`text-xs rounded px-2.5 py-1 border transition-colors ${
            showArchive
              ? "border-obsidian-accent text-obsidian-accent"
              : "border-obsidian-border text-obsidian-muted hover:text-obsidian-text hover:border-obsidian-accent"
          }`}
        >
          {showArchive ? "Hide archive" : "Show archive"}
        </button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto flex-1 min-h-0">
          <div className="flex gap-4 p-4 w-max mx-auto min-h-full">
            {columnKeys.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                cards={grouped[status] ?? []}
                onCardClick={setSelectedCard}
                onArchive={handleArchive}
                droppedFilename={droppedFilename}
              />
            ))}
          </div>
        </div>
      </DragDropContext>

      {showArchive && (
        <div className="border-t border-obsidian-border shrink-0 max-h-64 overflow-y-auto">
          <div className="px-4 py-2 flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-obsidian-muted">
              Archive
            </span>
            <span className="text-[10px] text-obsidian-muted bg-obsidian-bg px-1.5 py-0.5 rounded-full">
              {archivedCards.length}
            </span>
          </div>
          {archivedCards.length === 0 ? (
            <p className="px-4 pb-3 text-xs text-obsidian-muted">No archived cards.</p>
          ) : (
            <div className="flex flex-wrap gap-2 px-4 pb-3">
              {sortCards(archivedCards, sortBy).map((card) => (
                <div
                  key={card.filename}
                  className="bg-obsidian-panel border border-obsidian-border rounded-card p-3 w-[260px] opacity-60"
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => setSelectedArchivedCard(card)}
                      className="text-sm text-obsidian-text truncate flex-1 text-left hover:text-obsidian-accent transition-colors"
                    >
                      {card.title}
                    </button>
                    <button
                      onClick={() => handleUnarchive(card.filename)}
                      className="text-[10px] text-obsidian-muted hover:text-obsidian-accent shrink-0 border border-obsidian-border hover:border-obsidian-accent rounded px-1.5 py-0.5 transition-colors"
                    >
                      Restore
                    </button>
                  </div>
                  {card.priority && (
                    <span className="mt-1.5 inline-block text-[10px] text-obsidian-muted border border-obsidian-border px-1.5 py-0.5 rounded-full leading-none">
                      {card.priority}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedCard && (
        <CardModal
          card={selectedCard}
          allCards={cards}
          onClose={() => {
            setSelectedCard(null);
            setExternalChange(false);
          }}
          onSave={handleCardSave}
          onNavigate={(target) => {
            setSelectedCard(target);
            setExternalChange(false);
          }}
          onExternalChange={externalChange}
        />
      )}

      {selectedArchivedCard && (
        <CardModal
          card={selectedArchivedCard}
          allCards={cards}
          readOnly
          onClose={() => setSelectedArchivedCard(null)}
          onSave={() => {}}
          onNavigate={() => {}}
          onRestore={() => {
            handleUnarchive(selectedArchivedCard.filename);
            setSelectedArchivedCard(null);
          }}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
