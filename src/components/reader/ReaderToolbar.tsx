'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCw,
  Search,
  Sparkles,
  FileText,
  Highlighter,
  MoreHorizontal,
  Download,
  BookOpen,
  LayoutGrid,
  Columns,
  Square,
  PenTool,
  Eraser,
  Undo2,
  Redo2,
} from 'lucide-react';
import { GlassCard } from '@/components/common/GlassCard';
import { useSession } from 'next-auth/react';

interface ReaderToolbarProps {
  title: string;
  currentPage: number;
  totalPages: number;
  zoom: number;
  isTwoPage: boolean;
  isVisible: boolean;
  activeAnnotationTool: 'none' | 'highlight' | 'pen' | 'eraser';
  isAIOpen: boolean;
  isNotesOpen: boolean;
  isThumbnailsOpen: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onPageChange: (page: number) => void;
  onZoomChange: (zoom: number) => void;
  onToggleTwoPage: () => void;
  onRotate: () => void;
  onToggleFullscreen: () => void;
  onToggleAI: () => void;
  onToggleNotes: () => void;
  onToggleThumbnails: () => void;
  onToggleSearch: () => void;
  onSetAnnotationTool: (tool: 'none' | 'highlight' | 'pen' | 'eraser') => void;
  fileUrl: string;
}

export const ReaderToolbar: React.FC<ReaderToolbarProps> = ({
  title,
  currentPage,
  totalPages,
  zoom,
  isTwoPage,
  isVisible,
  activeAnnotationTool,
  isAIOpen,
  isNotesOpen,
  isThumbnailsOpen,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onPageChange,
  onZoomChange,
  onToggleTwoPage,
  onRotate,
  onToggleFullscreen,
  onToggleAI,
  onToggleNotes,
  onToggleThumbnails,
  onToggleSearch,
  onSetAnnotationTool,
  fileUrl,
}) => {
  const { data: session } = useSession();
  const [showMore, setShowMore] = useState(false);
  const [pageInput, setPageInput] = useState(String(currentPage));

  const handlePageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(pageInput, 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      onPageChange(p);
    } else {
      setPageInput(String(currentPage));
    }
  };

  React.useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  return (
    <>
      {/* Top Floating Glass Header Bar */}
      <header
        className={`fixed top-4 left-4 right-4 z-40 flex items-center justify-between pointer-events-none transition-all duration-300 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
        }`}
      >
        {/* Left: Back & Thumbnails & Title */}
        <GlassCard
          variant="pill"
          className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 shadow-xl max-w-md truncate bg-white/95 dark:bg-[#18181C]/95 border border-black/10 dark:border-white/20"
        >
          <Link
            href="/"
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-100 hover:text-black dark:hover:text-white transition-colors"
            title="Back to Library"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <button
            onClick={onToggleThumbnails}
            className={`p-1.5 rounded-full transition-colors ${
              isThumbnailsOpen
                ? 'bg-black/15 dark:bg-white/20 text-neutral-900 dark:text-white'
                : 'hover:bg-black/5 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-200 hover:text-black dark:hover:text-white'
            }`}
            title="Toggle Page Thumbnails"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-black/10 dark:bg-white/20 mx-1" />

          <span className="text-xs font-semibold text-neutral-900 dark:text-white truncate max-w-[180px] sm:max-w-[260px]">
            {title}
          </span>
        </GlassCard>

        {/* Right: Search & Actions */}
        <GlassCard
          variant="pill"
          className="pointer-events-auto flex items-center gap-1.5 px-2.5 py-1.5 shadow-xl bg-white/95 dark:bg-[#18181C]/95 border border-black/10 dark:border-white/20"
        >
          <button
            onClick={onToggleSearch}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-200 hover:text-black dark:hover:text-white transition-colors"
            title="Search PDF (Cmd+F)"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            onClick={() => onSetAnnotationTool(activeAnnotationTool === 'highlight' ? 'none' : 'highlight')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              activeAnnotationTool === 'highlight'
                ? 'bg-amber-400/25 text-amber-900 dark:text-amber-200 border border-amber-400/50'
                : 'hover:bg-black/5 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-200 hover:text-black dark:hover:text-white'
            }`}
            title="Highlight Text (H)"
          >
            <Highlighter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Highlight</span>
          </button>

          <button
            onClick={() => onSetAnnotationTool(activeAnnotationTool === 'pen' ? 'none' : 'pen')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              activeAnnotationTool === 'pen'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-semibold'
                : 'hover:bg-black/5 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-200 hover:text-black dark:hover:text-white'
            }`}
            title="Apple Pencil / Ink Drawing (P)"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ink</span>
          </button>

          <button
            onClick={() => onSetAnnotationTool(activeAnnotationTool === 'eraser' ? 'none' : 'eraser')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              activeAnnotationTool === 'eraser'
                ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/40'
                : 'hover:bg-black/5 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-200 hover:text-black dark:hover:text-white'
            }`}
            title="Eraser (E)"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Eraser</span>
          </button>

          <div className="h-4 w-px bg-black/10 dark:bg-white/20 mx-0.5" />

          {/* Undo */}
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded-full transition-colors ${
              canUndo
                ? 'hover:bg-black/5 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-200 hover:text-black dark:hover:text-white cursor-pointer'
                : 'text-neutral-300 dark:text-neutral-700 opacity-40 cursor-not-allowed'
            }`}
            title="Undo Highlight / Ink (⌘Z / Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>

          {/* Redo */}
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded-full transition-colors ${
              canRedo
                ? 'hover:bg-black/5 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-200 hover:text-black dark:hover:text-white cursor-pointer'
                : 'text-neutral-300 dark:text-neutral-700 opacity-40 cursor-not-allowed'
            }`}
            title="Redo (⌘⇧Z / Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-black/10 dark:bg-white/20 mx-1" />

          {/* Notes toggle */}
          <button
            onClick={onToggleNotes}
            className={`p-1.5 rounded-full transition-colors ${
              isNotesOpen
                ? 'bg-black/15 dark:bg-white/20 text-neutral-900 dark:text-white'
                : 'hover:bg-black/5 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-200 hover:text-black dark:hover:text-white'
            }`}
            title="Study Notes (N)"
          >
            <FileText className="w-4 h-4" />
          </button>

          {/* AI Tutor toggle */}
          <button
            onClick={onToggleAI}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              isAIOpen
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                : 'bg-black/5 dark:bg-white/15 hover:bg-black/10 dark:hover:bg-white/25 text-neutral-800 dark:text-white border border-black/5 dark:border-white/15'
            }`}
            title="Contextual AI Tutor"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI</span>
          </button>

          {/* More menu trigger */}
          <div className="relative">
            <button
              onClick={() => setShowMore(!showMore)}
              className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-200 hover:text-black dark:hover:text-white transition-colors"
              title="More reader settings"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {showMore && (
              <GlassCard
                variant="surface"
                className="absolute right-0 top-10 w-52 p-2 shadow-2xl z-50 border border-black/10 dark:border-white/20 bg-white/95 dark:bg-neutral-900/95 space-y-1"
              >
                <button
                  onClick={() => {
                    onToggleTwoPage();
                    setShowMore(false);
                  }}
                  className="flex items-center justify-between w-full px-3 py-2 text-xs rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-neutral-800 dark:text-neutral-200"
                >
                  <span className="flex items-center gap-2">
                    {isTwoPage ? <Columns className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                    <span>{isTwoPage ? 'Two-Page Spread' : 'Single Page View'}</span>
                  </span>
                </button>

                <button
                  onClick={() => {
                    onRotate();
                    setShowMore(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-neutral-800 dark:text-neutral-200"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Rotate Page (90°)</span>
                </button>

                <button
                  onClick={() => {
                    onToggleFullscreen();
                    setShowMore(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-neutral-800 dark:text-neutral-200"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Toggle Fullscreen</span>
                </button>

                <a
                  href={fileUrl}
                  download
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-neutral-800 dark:text-neutral-200"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Original PDF</span>
                </a>

                <div className="h-px bg-black/10 dark:bg-white/10 my-1" />

                <div className="px-3 py-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium truncate flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Study Mode Active</span>
                </div>
              </GlassCard>
            )}
          </div>
        </GlassCard>
      </header>

      {/* Bottom Floating Glass Navigation Bar */}
      <footer
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none transition-all duration-300 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <GlassCard
          variant="pill"
          className="pointer-events-auto flex items-center gap-2 sm:gap-3 px-3.5 py-2 shadow-xl bg-white/95 dark:bg-[#18181C]/95 border border-black/10 dark:border-white/20"
        >
          {/* Zoom controls */}
          <button
            onClick={() => onZoomChange(Math.max(0.5, zoom - 0.15))}
            className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-200 hover:text-black dark:hover:text-white transition-colors"
            title="Zoom Out (Cmd -)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-medium text-neutral-700 dark:text-neutral-200 w-10 text-center select-none">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => onZoomChange(Math.min(2.0, zoom + 0.15))}
            className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-200 hover:text-black dark:hover:text-white transition-colors"
            title="Zoom In (Cmd +)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-black/10 dark:bg-white/20" />

          {/* Page navigation */}
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - (isTwoPage ? 2 : 1)))}
            disabled={currentPage <= 1}
            className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-200 hover:text-black dark:hover:text-white disabled:opacity-30 cursor-pointer"
            title="Previous Page (Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Direct page input */}
          <form onSubmit={handlePageSubmit} className="flex items-center gap-1">
            <input
              type="text"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              className="text-xs font-mono font-semibold text-neutral-900 dark:text-white text-center w-10 py-0.5 rounded-md border border-black/10 dark:border-white/20 bg-black/5 dark:bg-white/10 outline-none focus:border-black/30 dark:focus:border-white/30"
            />
            <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400">
              / {totalPages}
            </span>
          </form>

          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + (isTwoPage ? 2 : 1)))}
            disabled={isTwoPage ? currentPage + 1 >= totalPages : currentPage >= totalPages}
            className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-200 hover:text-black dark:hover:text-white disabled:opacity-30 cursor-pointer"
            title="Next Page (Right Arrow)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-black/10 dark:bg-white/20" />

          {/* Quick Layout & Rotate buttons */}
          <button
            onClick={onToggleTwoPage}
            className={`p-1 rounded-full transition-colors ${
              isTwoPage
                ? 'bg-black/15 dark:bg-white/20 text-neutral-900 dark:text-white font-medium'
                : 'hover:bg-black/5 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-200 hover:text-black dark:hover:text-white'
            }`}
            title={isTwoPage ? 'Switch to Single-Page View' : 'Switch to Two-Page Spread'}
          >
            {isTwoPage ? <Columns className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          </button>

          <button
            onClick={onRotate}
            className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-200 hover:text-black dark:hover:text-white transition-colors"
            title="Rotate Page (90°)"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </GlassCard>
      </footer>
    </>
  );
};
