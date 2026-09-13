'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  Layers,
  CheckCircle2,
  Highlighter,
  FileText,
  Copy,
  ChevronRight,
  Lightbulb,
} from 'lucide-react';
import { GlassCard } from '@/components/common/GlassCard';

export interface SelectionState {
  text: string;
  pageNumber: number;
  rect: { top: number; left: number; width: number; height: number };
  rects?: Array<{ x: number; y: number; width: number; height: number }>;
}

interface SelectionMenuProps {
  selection: SelectionState | null;
  onExplain: (mode: 'explain' | 'simple' | 'example') => void;
  onMakeFlashcard: () => void;
  onMakeMCQ: () => void;
  onSummarize: () => void;
  onAddNote: () => void;
  onHighlight: () => void;
  onAskCustomAI: () => void;
  onClose: () => void;
}

export const SelectionMenu: React.FC<SelectionMenuProps> = ({
  selection,
  onExplain,
  onMakeFlashcard,
  onMakeMCQ,
  onSummarize,
  onAddNote,
  onHighlight,
  onAskCustomAI,
  onClose,
}) => {
  const [showMore, setShowMore] = useState(false);

  if (!selection || !selection.text.trim()) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(selection.text);
    onClose();
  };

  // Position above the selection
  const topPos = Math.max(70, selection.rect.top - 50);
  const leftPos = Math.max(20, Math.min(window.innerWidth - 340, selection.rect.left));

  return (
    <div
      onMouseDown={(e) => e.preventDefault()}
      style={{ top: `${topPos}px`, left: `${leftPos}px` }}
      className="fixed z-50 animate-in fade-in zoom-in-95 duration-150 select-none"
    >
      <GlassCard
        variant="pill"
        className="p-1.5 shadow-2xl border border-black/15 dark:border-white/20 bg-white dark:bg-[#18181C] flex items-center gap-1 text-xs"
      >
        <button
          onClick={() => onExplain('explain')}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 font-semibold shadow-xs transition-colors"
          title="Contextual Explanation"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Explain</span>
        </button>

        <button
          onClick={() => onExplain('example')}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-200 transition-colors"
          title="Practical Example"
        >
          <Lightbulb className="w-3.5 h-3.5" />
          <span>Example</span>
        </button>

        <button
          onClick={onMakeFlashcard}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-200 transition-colors"
          title="Create Flashcard"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Flashcard</span>
        </button>

        <button
          onClick={onMakeMCQ}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-200 transition-colors"
          title="Generate MCQ Quiz Question"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>MCQ</span>
        </button>

        <button
          onClick={onHighlight}
          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-200 transition-colors"
          title="Highlight Text"
        >
          <Highlighter className="w-3.5 h-3.5 text-amber-500" />
        </button>

        <button
          onClick={onAddNote}
          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-200 transition-colors"
          title="Add to Notes"
        >
          <FileText className="w-3.5 h-3.5" />
        </button>

        <div className="h-3 w-px bg-black/10 dark:bg-white/15 mx-0.5" />

        <button
          onClick={handleCopy}
          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
          title="Copy Text"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      </GlassCard>
    </div>
  );
};
