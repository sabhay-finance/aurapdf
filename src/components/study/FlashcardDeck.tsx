'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Layers, RotateCcw, BookOpen, ArrowRight, Check, X, Sparkles } from 'lucide-react';
import { GlassCard } from '@/components/common/GlassCard';
import { GlassButton } from '@/components/common/GlassButton';
import { Flashcard } from '@/types';

interface FlashcardDeckProps {
  flashcards: Flashcard[];
  onReviewCard: (id: string, rating: number) => Promise<void>;
  onRefresh: () => void;
}

export const FlashcardDeck: React.FC<FlashcardDeckProps> = ({
  flashcards,
  onReviewCard,
  onRefresh,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleGenerateCards = async () => {
    try {
      setGenerating(true);
      const docsRes = await fetch('/api/documents');
      const docsData = await docsRes.json();
      if (docsData.success && docsData.documents?.length > 0) {
        const doc = docsData.documents[0];
        const apiKey = typeof window !== 'undefined' ? localStorage.getItem('aura_api_key') || undefined : undefined;
        const provider = typeof window !== 'undefined' ? localStorage.getItem('aura_ai_provider') || undefined : undefined;

        await fetch('/api/ai/generate-flashcards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            document_id: doc.id,
            page_number: doc.last_page || 1,
            count: 3,
            saveToDatabase: true,
            apiKey,
            provider,
          }),
        });
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  if (!flashcards.length) {
    return (
      <GlassCard variant="surface" className="p-12 text-center max-w-lg mx-auto space-y-5">
        <Layers className="w-10 h-10 text-neutral-400 mx-auto stroke-1" />
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
            No Active Flashcards Due
          </h3>
          <p className="text-xs text-neutral-500">
            Create cards directly while reading by selecting any passage, or generate a fresh set with AI from your textbook.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <GlassButton
            variant="primary"
            size="sm"
            disabled={generating}
            onClick={handleGenerateCards}
            className="gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{generating ? 'Generating Cards...' : 'Generate with AI'}</span>
          </GlassButton>
          <Link href="/">
            <GlassButton variant="default" size="sm" className="gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Go to Reader</span>
            </GlassButton>
          </Link>
        </div>
      </GlassCard>
    );
  }

  const currentCard = flashcards[currentIndex];

  const handleRate = async (rating: number) => {
    try {
      setSubmitting(true);
      await onReviewCard(currentCard.id, rating);
      setIsFlipped(false);
      if (currentIndex < flashcards.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        onRefresh();
        setCurrentIndex(0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center justify-between text-xs font-mono text-neutral-500">
        <span>Card {currentIndex + 1} of {flashcards.length}</span>
        {currentCard.document && <span>{currentCard.document.title}</span>}
      </div>

      {/* 3D Flashcard */}
      <div
        onClick={() => setIsFlipped(!isFlipped)}
        className="min-h-[280px] p-8 rounded-3xl cursor-pointer select-none transition-all duration-300 shadow-xl border border-black/10 dark:border-white/15 bg-white/90 dark:bg-neutral-900/90 flex flex-col justify-between hover:border-black/25 dark:hover:border-white/30 relative"
      >
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span className="uppercase tracking-widest font-mono text-[10px]">
            {isFlipped ? 'ANSWER (BACK)' : 'QUESTION (FRONT)'}
          </span>
          <span className="text-[11px] font-mono text-neutral-400">
            Click card or spacebar to flip
          </span>
        </div>

        <div className="my-auto py-6">
          <h3 className="text-xl md:text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white leading-snug">
            {isFlipped ? currentCard.answer : currentCard.question}
          </h3>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-black/5 dark:border-white/10 text-xs">
          <Link
            href={`/reader/${currentCard.document_id}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white font-mono transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Source: Page {currentCard.source_page}</span>
            <ArrowRight className="w-3 h-3" />
          </Link>

          {currentCard.tags && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-neutral-400">
              {currentCard.tags}
            </span>
          )}
        </div>
      </div>

      {/* Rating Buttons (SM-2 Spaced Repetition) */}
      {isFlipped ? (
        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <span className="text-xs uppercase font-mono tracking-wider text-neutral-400 text-center block">
            Rate your recall difficulty:
          </span>
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => handleRate(1)}
              disabled={submitting}
              className="py-3 px-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold text-center transition-all"
            >
              1. Again (1d)
            </button>
            <button
              onClick={() => handleRate(2)}
              disabled={submitting}
              className="py-3 px-2 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold text-center transition-all"
            >
              2. Hard (2d)
            </button>
            <button
              onClick={() => handleRate(3)}
              disabled={submitting}
              className="py-3 px-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold text-center transition-all"
            >
              3. Good (4d)
            </button>
            <button
              onClick={() => handleRate(4)}
              disabled={submitting}
              className="py-3 px-2 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold text-center transition-all"
            >
              4. Easy (7d)
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <GlassButton
            variant="default"
            onClick={() => setIsFlipped(true)}
            className="w-full justify-center py-3 font-medium text-xs"
          >
            Reveal Answer
          </GlassButton>
        </div>
      )}
    </div>
  );
};
