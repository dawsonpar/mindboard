'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { Card } from '@/types/card';
import { CardArticle } from '@/components/card/CardArticle';
import { Toast } from '@/components/Toast';

export default function CardPage() {
  const params = useParams<{ project: string; filename: string }>();
  // Next.js already decodes dynamic route segments.
  const project = params.project;
  const filename = params.filename;

  const [card, setCard] = useState<Card | null>(null);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'info' | 'error' | 'success';
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMissing(false);
    try {
      const res = await fetch(`/api/cards?project=${encodeURIComponent(project)}`);
      const data = await res.json();
      const cards: Card[] = data.cards ?? [];
      setAllCards(cards);
      const found = cards.find((c) => c.filename === filename) ?? null;
      if (!found) {
        setMissing(true);
        setCard(null);
      } else {
        setCard(found);
      }
    } catch {
      setToast({ message: 'Failed to load card', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [project, filename]);

  useEffect(() => {
    load();
  }, [load]);

  // Optimistic save: merge locally, then PUT and reconcile with the server card.
  const handleSave = useCallback(
    (updates: Partial<Card>) => {
      setCard((prev) => (prev ? { ...prev, ...updates } : prev));
      fetch(`/api/cards/${encodeURIComponent(project)}/${encodeURIComponent(filename)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error('save failed');
          const updated: Card = await res.json();
          setCard(updated);
          setAllCards((prev) => prev.map((c) => (c.filename === updated.filename ? updated : c)));
        })
        .catch(() => {
          setToast({ message: 'Failed to save card', type: 'error' });
          load();
        });
    },
    [project, filename, load],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-obsidian-muted text-sm">
        Loading card…
      </div>
    );
  }

  if (missing || !card) {
    return (
      <div className="mx-auto w-full max-w-2xl px-6 py-16 text-sm text-obsidian-muted">
        <p className="mb-2">Card not found.</p>
        <Link href="/" className="text-obsidian-accent hover:underline">
          Return to board
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-obsidian-bg">
      <CardArticle card={card} allCards={allCards} onSave={handleSave} />
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  );
}
