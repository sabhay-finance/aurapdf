'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';
import { GlassCard } from '@/components/common/GlassCard';
import { Document } from '@/types';

interface HeroContinueProps {
  document: Document | null;
}

export const HeroContinue: React.FC<HeroContinueProps> = ({ document }) => {
  if (!document) return null;

  const currentPage = document.last_page || 1;
  const totalPages = Math.max(1, document.page_count || 8);
  const percentage = Math.min(100, Math.round((currentPage / totalPages) * 100));

  return (
    <GlassCard variant="surface" className="p-6 md:p-8 relative overflow-hidden group">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-4 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs uppercase tracking-wider font-semibold text-neutral-400">
              Continue Studying
            </span>
          </div>

          <div>
            <span className="text-xs font-mono text-neutral-500 block mb-1">
              {document.folder || 'Curriculum'}
            </span>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white">
              {document.title}
            </h2>
          </div>

          {/* Progress bar */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs font-mono text-neutral-500">
              <span>Page {currentPage} / {totalPages}</span>
              <span>{percentage}% completed</span>
            </div>
            <div className="w-full h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-neutral-900 dark:bg-white rounded-full transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* CTA */}
        <Link
          href={`/reader/${document.id}`}
          className="inline-flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-950 font-medium text-base shadow-lg transition-all duration-200 active:scale-[0.98] self-start md:self-auto shrink-0"
        >
          <span>Continue Reading</span>
          <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </GlassCard>
  );
};
