'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  BookOpen,
  Sparkles,
  Layers,
  CheckCircle2,
  Moon,
  Sun,
  FileText,
  Map,
  X,
  ArrowRight,
} from 'lucide-react';
import { GlassCard } from './GlassCard';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  currentDocumentId?: string;
  onJumpToPage?: (page: number) => void;
  onOpenAI?: (query?: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  currentDocumentId,
  onJumpToPage,
  onOpenAI,
}) => {
  const [query, setQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // parent handles toggle
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark');
    onClose();
  };

  const commands = [
    {
      id: 'ask-ai',
      label: 'Ask AI Tutor about this document',
      icon: Sparkles,
      action: () => {
        onClose();
        if (onOpenAI) onOpenAI(query || undefined);
        else if (currentDocumentId) router.push(`/reader/${currentDocumentId}?ai=true`);
      },
    },
    {
      id: 'practice',
      label: 'Start MCQ Practice Mode',
      icon: CheckCircle2,
      action: () => {
        onClose();
        router.push(currentDocumentId ? `/study/practice?doc=${currentDocumentId}` : '/study/practice');
      },
    },
    {
      id: 'flashcards',
      label: 'Review Flashcards (Spaced Repetition)',
      icon: Layers,
      action: () => {
        onClose();
        router.push(currentDocumentId ? `/study/flashcards?doc=${currentDocumentId}` : '/study/flashcards');
      },
    },
    {
      id: 'study-map',
      label: 'Open Course Study Map & Syllabus',
      icon: Map,
      action: () => {
        onClose();
        router.push(currentDocumentId ? `/study/map?doc=${currentDocumentId}` : '/study/map');
      },
    },
    {
      id: 'library',
      label: 'Return to Library',
      icon: BookOpen,
      action: () => {
        onClose();
        router.push('/');
      },
    },
    {
      id: 'theme',
      label: 'Toggle Dark / Light Appearance',
      icon: Moon,
      action: toggleDarkMode,
    },
  ];

  const filteredCommands = query
    ? commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()))
    : commands;

  // Handle jump to page if query is a number
  const pageNumber = parseInt(query, 10);
  const isPageJump = !isNaN(pageNumber) && pageNumber > 0 && onJumpToPage;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/60 backdrop-blur-md transition-opacity">
      <div
        className="w-full max-w-xl p-0 rounded-2xl overflow-hidden shadow-2xl border border-black/15 dark:border-white/20 bg-white dark:bg-[#121214] text-neutral-900 dark:text-white"
      >
        <div className="flex items-center px-4 py-3 border-b border-black/10 dark:border-white/10 gap-3">
          <Search className="w-5 h-5 text-neutral-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, question, or page number..."
            className="flex-1 bg-transparent border-none outline-none text-neutral-900 dark:text-white placeholder-neutral-400 text-sm font-medium"
            autoFocus
          />
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {isPageJump && (
            <button
              onClick={() => {
                onJumpToPage(pageNumber);
                onClose();
              }}
              className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-left text-sm hover:bg-black/5 dark:hover:bg-white/10 text-neutral-900 dark:text-white group"
            >
              <span className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-neutral-500" />
                <span>Jump directly to <strong>Page {pageNumber}</strong></span>
              </span>
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}

          {filteredCommands.map((cmd) => {
            const Icon = cmd.icon;
            return (
              <button
                key={cmd.id}
                onClick={cmd.action}
                className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-left text-sm hover:bg-black/5 dark:hover:bg-white/10 text-neutral-900 dark:text-white group transition-colors"
              >
                <span className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-neutral-500 group-hover:text-neutral-900 dark:group-hover:text-white" />
                  <span>{cmd.label}</span>
                </span>
                <kbd className="text-[10px] text-neutral-400 font-mono">↵</kbd>
              </button>
            );
          })}

          {filteredCommands.length === 0 && !isPageJump && (
            <div className="py-8 text-center text-xs text-neutral-400">
              No matching commands found. Press Enter to ask AI: &quot;{query}&quot;
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
