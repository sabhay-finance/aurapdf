'use client';

import React, { useState, useEffect } from 'react';
import { Navigation } from '@/components/common/Navigation';
import { FlashcardDeck } from '@/components/study/FlashcardDeck';
import { GlassButton } from '@/components/common/GlassButton';
import { Layers, Plus, Download, Sparkles } from 'lucide-react';
import { Flashcard } from '@/types';

export default function FlashcardsPage() {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [dueOnly, setDueOnly] = useState(false);

  const fetchFlashcards = async () => {
    try {
      setLoading(true);
      const url = dueOnly ? '/api/flashcards?due_only=true' : '/api/flashcards';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setFlashcards(data.flashcards);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlashcards();
  }, [dueOnly]);

  const handleReviewCard = async (id: string, rating: number) => {
    await fetch(`/api/flashcards/${id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating }),
    });
  };

  return (
    <div className="flex h-screen bg-[var(--bg)] text-[var(--fg)] overflow-hidden">
      <Navigation />

      <main className="flex-1 h-screen overflow-y-auto p-6 md:p-12 pb-24 max-w-4xl mx-auto space-y-8">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/5 dark:border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-neutral-400" />
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                Active Recall & Flashcards
              </h1>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Spaced-repetition scheduling optimizes memory retention based on the SM-2 algorithm.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDueOnly(!dueOnly)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
                dueOnly
                  ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-950'
                  : 'border-black/10 dark:border-white/15 text-neutral-600 dark:text-neutral-300'
              }`}
            >
              {dueOnly ? 'Showing Due Only' : 'Show All Cards'}
            </button>
          </div>
        </header>

        {loading ? (
          <div className="py-24 text-center text-xs text-neutral-400">
            Loading flashcards...
          </div>
        ) : (
          <FlashcardDeck
            flashcards={flashcards}
            onReviewCard={handleReviewCard}
            onRefresh={fetchFlashcards}
          />
        )}
      </main>
    </div>
  );
}
