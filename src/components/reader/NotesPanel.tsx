'use client';

import React, { useState } from 'react';
import { X, Plus, FileText, Trash2, ArrowRight, CornerDownRight } from 'lucide-react';
import { GlassCard } from '@/components/common/GlassCard';
import { GlassButton } from '@/components/common/GlassButton';
import { Note } from '@/types';

interface NotesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  currentPage: number;
  notes: Note[];
  onAddNote: (content: string, pageNumber: number, selectedText?: string) => Promise<void>;
  onDeleteNote: (id: string) => Promise<void>;
  onNavigateToPage: (page: number) => void;
  selectedText?: string;
}

export const NotesPanel: React.FC<NotesPanelProps> = ({
  isOpen,
  onClose,
  documentId,
  currentPage,
  notes,
  onAddNote,
  onDeleteNote,
  onNavigateToPage,
  selectedText,
}) => {
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!newNoteContent.trim()) return;
    await onAddNote(newNoteContent, currentPage, selectedText);
    setNewNoteContent('');
    setIsAdding(false);
  };

  return (
    <aside className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-96 md:w-[400px] p-3 sm:p-4 flex flex-col pointer-events-auto animate-in slide-in-from-right duration-200">
      <div className="h-full flex flex-col p-5 rounded-2xl shadow-2xl border border-black/15 dark:border-white/15 bg-white dark:bg-[#121214] text-neutral-900 dark:text-white">
        <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-neutral-700 dark:text-neutral-200" />
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
              Study Notes ({notes.length})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action: Add note on current page */}
        <div className="py-3 border-b border-black/5 dark:border-white/10">
          {!isAdding ? (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center justify-center gap-2 w-full text-xs py-2.5 px-4 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 font-medium hover:opacity-90 transition-opacity shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Note on Page {currentPage}</span>
            </button>
          ) : (
            <div className="space-y-2.5 p-3.5 rounded-xl bg-neutral-100 dark:bg-[#1A1A1E] border border-black/10 dark:border-white/15">
              <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 block uppercase font-medium">
                New Note — Page {currentPage}
              </span>
              {selectedText && (
                <p className="text-[11px] italic text-neutral-600 dark:text-neutral-300 line-clamp-2 border-l-2 border-neutral-400 pl-2">
                  &quot;{selectedText}&quot;
                </p>
              )}
              <textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Type your study note or formula insight..."
                rows={3}
                className="w-full p-2.5 text-xs rounded-lg border border-black/15 dark:border-white/20 bg-white dark:bg-[#161618] text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 outline-none resize-none"
                autoFocus
              />
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 hover:opacity-90"
                >
                  Save Note
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto space-y-3 py-3 pr-1">
          {notes.length === 0 ? (
            <div className="py-16 text-center text-xs text-neutral-400 space-y-2">
              <FileText className="w-6 h-6 mx-auto stroke-1" />
              <p>No notes created yet for this PDF.</p>
              <p>Select text in the reader to link notes to exact passages.</p>
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className="p-3.5 rounded-xl bg-neutral-100 dark:bg-[#1A1A1E] border border-black/5 dark:border-white/15 text-xs space-y-2 group transition-all"
              >
                <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
                  <button
                    onClick={() => onNavigateToPage(note.page_number)}
                    className="inline-flex items-center gap-1 font-mono font-medium hover:text-neutral-900 dark:hover:text-white transition-colors"
                  >
                    <span>Page {note.page_number}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onDeleteNote(note.id)}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity p-1"
                    title="Delete Note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {note.selected_text && (
                  <p className="text-[11px] italic text-neutral-500 dark:text-neutral-400 line-clamp-2 border-l-2 border-neutral-300 dark:border-neutral-600 pl-2">
                    &quot;{note.selected_text}&quot;
                  </p>
                )}

                <p className="text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap leading-relaxed">
                  {note.content}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
};
