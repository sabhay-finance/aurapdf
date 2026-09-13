'use client';

import React from 'react';
import Link from 'next/link';
import { TrendingUp, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { GlassCard } from '@/components/common/GlassCard';
import { TopicAnalysis } from '@/lib/study/weakTopics';

interface WeakTopicsChartProps {
  topics: TopicAnalysis[];
  documentId?: string;
}

export const WeakTopicsChart: React.FC<WeakTopicsChartProps> = ({ topics, documentId }) => {
  if (!topics.length) {
    return (
      <div className="text-center py-8 text-xs text-neutral-400">
        No practice attempt data logged yet. Take a practice quiz to generate topic mastery scores.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {topics.map((t) => {
        const isWeak = t.isWeak;
        const colorClass = !t.hasEnoughData
          ? 'bg-neutral-300 dark:bg-neutral-700'
          : t.accuracyPercentage < 50
          ? 'bg-red-500'
          : t.accuracyPercentage < 75
          ? 'bg-amber-500'
          : 'bg-emerald-500';

        return (
          <GlassCard
            key={t.topic}
            variant="card"
            className="p-4 space-y-2 hover:border-black/20 dark:hover:border-white/20 transition-all"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
              <div className="flex items-center gap-2">
                {isWeak ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                )}
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {t.topic}
                </span>
              </div>

              <span className="font-mono text-neutral-500 text-[11px]">
                {t.confidenceLabel}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
                style={{ width: `${Math.max(6, t.accuracyPercentage)}%` }}
              />
            </div>

            {t.recommendedPages && t.recommendedPages.length > 0 && documentId && (
              <div className="pt-1 flex items-center justify-between text-[11px]">
                <span className="text-neutral-400">
                  Pages: {t.recommendedPages.sort((a, b) => a - b).join(', ')}
                </span>
                <Link
                  href={`/reader/${documentId}?page=${t.recommendedPages[0]}`}
                  className="inline-flex items-center gap-1 text-neutral-700 dark:text-neutral-300 hover:underline font-mono"
                >
                  <span>Review Concept</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </GlassCard>
        );
      })}
    </div>
  );
};
