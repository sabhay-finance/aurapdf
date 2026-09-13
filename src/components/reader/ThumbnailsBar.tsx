'use client';

import React from 'react';
import { X, ChevronRight } from 'lucide-react';
import { GlassCard } from '@/components/common/GlassCard';

interface ThumbnailsBarProps {
  isOpen: boolean;
  onClose: () => void;
  totalPages: number;
  currentPage: number;
  onSelectPage: (page: number) => void;
}

export const ThumbnailsBar: React.FC<ThumbnailsBarProps> = ({
  isOpen,
  onClose,
  totalPages,
  currentPage,
  onSelectPage,
}) => {
  if (!isOpen) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <aside className="fixed left-4 top-20 bottom-24 w-60 z-40 animate-in slide-in-from-left duration-200">
      <div
        className="h-full p-4 rounded-2xl flex flex-col shadow-2xl border border-black/15 dark:border-white/15 bg-white dark:bg-[#121214] text-neutral-900 dark:text-white"
      >
        <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/10">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Pages ({totalPages})
          </span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 py-3 pr-1">
          {pages.map((p) => {
            const isCurrent = p === currentPage;
            return (
              <button
                key={p}
                onClick={() => {
                  onSelectPage(p);
                }}
                className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-mono transition-all text-left group ${
                  isCurrent
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-semibold shadow-xs'
                    : 'hover:bg-black/5 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-300 font-medium'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 text-right opacity-60">#{p}</span>
                  <span>Page {p}</span>
                </div>
                {isCurrent && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
