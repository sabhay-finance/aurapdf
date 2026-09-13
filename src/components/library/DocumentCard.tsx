'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Star,
  Trash2,
  Clock,
  Download,
  Eye,
  Flag,
  User,
  MoreVertical,
} from 'lucide-react';
import { GlassCard } from '@/components/common/GlassCard';
import { ReportModal } from '@/components/library/ReportModal';
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
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const currentPage = document.last_page || 1;
  const totalPages = Math.max(1, document.page_count || 1);
  const percentage = Math.min(100, Math.round((currentPage / totalPages) * 100));

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const formattedDate = formatTimeAgo(document.uploaded_at || document.created_at);

  return (
    <>
      <GlassCard
        variant="card"
        hoverEffect
        className="p-5 flex flex-col justify-between h-[210px] group relative transition-all"
      >
        <div>
          {/* Header row: category, uploader, favorite & more */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-neutral-600 dark:text-neutral-300 truncate max-w-[130px]">
                {document.category || 'General'}
              </span>
              {formattedDate && (
                <span className="text-[10px] text-neutral-400 shrink-0">
                  • {formattedDate}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Favorite button */}
              {onToggleFavorite && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(document.id, !!document.is_favorite);
                  }}
                  className="text-neutral-400 hover:text-amber-500 p-1 rounded-md transition-colors"
                  title={document.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Star
                    className={`w-3.5 h-3.5 ${
                      document.is_favorite ? 'fill-amber-500 text-amber-500' : ''
                    }`}
                  />
                </button>
              )}

              {/* Action dropdown */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDropdown(!showDropdown);
                  }}
                  className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                  title="Document actions"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>

                {showDropdown && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-[#1c1c20] border border-black/10 dark:border-white/10 rounded-xl shadow-xl z-20 py-1 overflow-hidden"
                  >
                    <a
                      href={`/api/documents/${document.id}/download`}
                      download
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs text-neutral-700 dark:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>

                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        setIsReportOpen(true);
                      }}
                      className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs text-neutral-700 dark:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span>Report</span>
                    </button>

                    {onDelete && (
                      <button
                        onClick={() => {
                          setShowDropdown(false);
                          if (confirm('Are you sure you want to delete this community document?')) {
                            onDelete(document.id);
                          }
                        }}
                        className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors border-t border-black/5 dark:border-white/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Title & Document Info */}
          <Link href={`/reader/${document.id}`} className="block group/link">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white line-clamp-2 group-hover/link:underline">
              {document.title}
            </h3>
            {document.description ? (
              <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5">
                {document.description}
              </p>
            ) : (
              <div className="flex items-center gap-1 text-[11px] text-neutral-400 mt-0.5">
                <User className="w-3 h-3" />
                <span className="truncate">{document.uploaded_by || 'Community Member'}</span>
              </div>
            )}
          </Link>
        </div>

        {/* Bottom stats & reading progress */}
        <div className="space-y-2.5 pt-2">
          {/* Views & Downloads stats */}
          <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1" title="Community views">
                <Eye className="w-3 h-3" />
                <span>{document.view_count || 0}</span>
              </span>
              <span className="flex items-center gap-1" title="Community downloads">
                <Download className="w-3 h-3" />
                <span>{document.download_count || 0}</span>
              </span>
            </div>

            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{totalPages}p</span>
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-neutral-900 dark:bg-white rounded-full transition-all"
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Bottom actions */}
          <div className="flex items-center justify-between pt-1">
            <Link
              href={`/reader/${document.id}`}
              className="text-xs font-semibold text-neutral-900 dark:text-white hover:underline flex items-center gap-1"
            >
              <span>Open Reader</span>
              <span>→</span>
            </Link>

            <a
              href={`/api/documents/${document.id}/download`}
              download
              className="text-[11px] text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10"
              title="Download PDF"
            >
              <Download className="w-3 h-3" />
              <span>PDF</span>
            </a>
          </div>
        </div>
      </GlassCard>

      {/* Community Report Modal */}
      <ReportModal
        isOpen={isReportOpen}
        documentId={document.id}
        documentTitle={document.title}
        onClose={() => setIsReportOpen(false)}
      />
    </>
  );
};
