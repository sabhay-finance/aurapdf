'use client';

import React from 'react';
import Link from 'next/link';
import { FileText, Star, Trash2, Clock, MoreVertical } from 'lucide-react';
import { GlassCard } from '@/components/common/GlassCard';
import { Document } from '@/types';

interface DocumentCardProps {
  document: Document;
  onDelete?: (id: string) => void;
  onToggleFavorite?: (id: string, current: boolean) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  onDelete,
  onToggleFavorite,
}) => {
  const currentPage = document.last_page || 1;
  const totalPages = Math.max(1, document.page_count || 8);
  const percentage = Math.min(100, Math.round((currentPage / totalPages) * 100));

  return (
    <GlassCard
      variant="card"
      hoverEffect
      className="p-5 flex flex-col justify-between h-48 group relative transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <Link href={`/reader/${document.id}`} className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center text-neutral-700 dark:text-neutral-200 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-mono text-neutral-400 block uppercase tracking-wider truncate">
              {document.folder || 'PDF Document'}
            </span>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white truncate group-hover:underline">
              {document.title}
            </h3>
          </div>
        </Link>

        {/* Favorite button */}
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(document.id, !!document.is_favorite);
            }}
            className="text-neutral-400 hover:text-amber-500 p-1 rounded-md transition-colors"
          >
            <Star
              className={`w-4 h-4 ${
                document.is_favorite ? 'fill-amber-500 text-amber-500' : ''
              }`}
            />
          </button>
        )}
      </div>

      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between text-xs text-neutral-400 font-mono">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Page {currentPage} / {totalPages}</span>
          </span>
          <span>{percentage}%</span>
        </div>

        <div className="w-full h-1 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-neutral-900 dark:bg-white rounded-full transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <Link
            href={`/reader/${document.id}`}
            className="text-xs font-medium text-neutral-900 dark:text-white hover:underline"
          >
            Open Reader →
          </Link>

          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Delete this document from your library?')) {
                  onDelete(document.id);
                }
              }}
              className="text-neutral-400 hover:text-red-500 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
              title="Delete PDF"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </GlassCard>
  );
};
