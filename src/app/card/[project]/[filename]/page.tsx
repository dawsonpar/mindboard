'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { Card } from '@/types/card';
import { CardArticle } from '@/components/card/CardArticle';
import { Toast } from '@/components/Toast';

/**
 * Full-page view of one card. Next.js decodes the dynamic route segments, so
 * `project` and `filename` arrive decoded. A save changes the card in the
 * list at once, then replaces it with the copy the server returns.
 */
export default function CardPage() {
  const params = useParams<{ project: string; filename: string }>();
  const project = params.project;
  const filename = params.filename;
  const cardKey = `${project}/${filename}`;

  const [allCards, setAllCards] = useState<Card[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: 'info' | 'error' | 'success';
  } | null>(null);

  const loading = loadedKey !== cardKey;
  const card = allCards.find((c) => c.filename === filename) ?? null;

  const load = useCallback(() => {
    return fetch(`/api/cards?project=${encodeURIComponent(project)}`)
      .then((res) => res.json())
      .then((data) => setAllCards(data.cards ?? []))
      .catch(() => setToast({ message: 'Failed to load card', type: 'error' }))
      .finally(() => setLoadedKey(cardKey));
  }, [project, cardKey]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = useCallback(
    (updates: Partial<Card>) => {
      setAllCards((prev) => prev.map((c) => (c.filename === filename ? { ...c, ...updates } : c)));
      fetch(`/api/cards/${encodeURIComponent(project)}/${encodeURIComponent(filename)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error('save failed');
          const updated: Card = await res.json();
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

  if (!card) {
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
