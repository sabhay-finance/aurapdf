'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  FileText,
  Trash2,
  ArrowRight,
  Check,
  Loader2,
  Edit3,
} from 'lucide-react';
import { Note } from '@/types';

interface NotesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  currentPage: number;
  notes: Note[];
  onAddNote: (content: string, pageNumber: number, selectedText?: string) => Promise<void>;
  onUpdateNote?: (id: string, content: string) => Promise<void>;
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
  onUpdateNote,
  onDeleteNote,
  onNavigateToPage,
  selectedText,
}) => {
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [editingStatus, setEditingStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const draftKey = `aura_note_draft_${documentId}_p${currentPage}`;
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const editDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Restore draft when opening or switching page
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        setNewNoteContent(savedDraft);
        setIsAdding(true);
      }
    }
  }, [draftKey]);

  // Open note form automatically if selected text is passed
  useEffect(() => {
    if (selectedText) {
      setIsAdding(true);
    }
  }, [selectedText]);

  // Auto-save draft to localStorage on typing
  const handleContentChange = (val: string) => {
    setNewNoteContent(val);
    setAutoSaveStatus('saving');

    if (typeof window !== 'undefined') {
      if (val.trim()) {
        localStorage.setItem(draftKey, val);
      } else {
        localStorage.removeItem(draftKey);
      }
    }

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus('idle'), 1800);
    }, 400);
  };

  const handleCreate = async () => {
    if (!newNoteContent.trim()) return;
    setAutoSaveStatus('saving');
    try {
      await onAddNote(newNoteContent, currentPage, selectedText);
      setNewNoteContent('');
      if (typeof window !== 'undefined') {
        localStorage.removeItem(draftKey);
      }
      setIsAdding(false);
      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus('idle'), 1500);
    } catch {
      setAutoSaveStatus('idle');
    }
  };

  // Inline edit existing note with auto-save debounce
  const handleStartEdit = (note: Note) => {
    setEditingNoteId(note.id);
    setEditingContent(note.content);
    setEditingStatus('idle');
  };

  const handleEditChange = (val: string, noteId: string) => {
    setEditingContent(val);
    setEditingStatus('saving');

    if (editDebounceRef.current) clearTimeout(editDebounceRef.current);
    editDebounceRef.current = setTimeout(async () => {
      if (onUpdateNote && val.trim()) {
        try {
          await onUpdateNote(noteId, val);
          setEditingStatus('saved');
          setTimeout(() => setEditingStatus('idle'), 1600);
        } catch {
          setEditingStatus('idle');
        }
      }
    }, 600);
  };

  const handleFinishEdit = async (noteId: string) => {
    if (onUpdateNote && editingContent.trim()) {
      await onUpdateNote(noteId, editingContent);
    }
    setEditingNoteId(null);
  };

  if (!isOpen) return null;

  return (
    <aside className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-96 md:w-[400px] p-3 sm:p-4 flex flex-col pointer-events-auto animate-in slide-in-from-right duration-200">
      <div className="h-full flex flex-col p-5 rounded-2xl shadow-2xl border border-black/15 dark:border-white/15 bg-white dark:bg-[#121214] text-neutral-900 dark:text-white">
        {/* Header */}
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
              className="flex items-center justify-center gap-2 w-full text-xs py-2.5 px-4 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 font-medium hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Note on Page {currentPage}</span>
            </button>
          ) : (
            <div className="space-y-2.5 p-3.5 rounded-xl bg-neutral-100 dark:bg-[#1A1A1E] border border-black/10 dark:border-white/15 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 block uppercase font-medium">
                  New Note — Page {currentPage}
                </span>
                {autoSaveStatus === 'saving' && (
                  <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    <span>Auto-saving draft...</span>
                  </span>
                )}
                {autoSaveStatus === 'saved' && (
                  <span className="text-[10px] text-emerald-500 flex items-center gap-1">
                    <Check className="w-2.5 h-2.5" />
                    <span>Draft auto-saved</span>
                  </span>
                )}
              </div>

              {selectedText && (
                <p className="text-[11px] italic text-neutral-600 dark:text-neutral-300 line-clamp-2 border-l-2 border-neutral-400 pl-2">
                  &quot;{selectedText}&quot;
                </p>
              )}

              <textarea
                value={newNoteContent}
                onChange={(e) => handleContentChange(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
                placeholder="Type your note (auto-saves draft as you type)..."
                rows={3}
                className="w-full p-2.5 text-xs rounded-lg border border-black/15 dark:border-white/20 bg-white dark:bg-[#161618] text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 outline-none resize-none"
                autoFocus
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-neutral-400">⌘+Enter to save</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsAdding(false);
                      if (!newNoteContent.trim() && typeof window !== 'undefined') {
                        localStorage.removeItem(draftKey);
                      }
                    }}
                    className="px-3 py-1.5 text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!newNoteContent.trim()}
                    className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 hover:opacity-90 disabled:opacity-40"
                  >
                    Save Note
                  </button>
                </div>
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
                    className="inline-flex items-center gap-1 font-mono font-medium hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <span>Page {note.page_number}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>

                  <div className="flex items-center gap-1.5">
                    {editingNoteId === note.id && editingStatus === 'saving' && (
                      <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        <span>Saving...</span>
                      </span>
                    )}
                    {editingNoteId === note.id && editingStatus === 'saved' && (
                      <span className="text-[10px] text-emerald-500 flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" />
                        <span>Saved</span>
                      </span>
                    )}

                    {editingNoteId !== note.id && (
                      <button
                        onClick={() => handleStartEdit(note)}
                        className="opacity-0 group-hover:opacity-100 hover:text-neutral-900 dark:hover:text-white transition-opacity p-1"
                        title="Edit note"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    )}

                    <button
                      onClick={() => onDeleteNote(note.id)}
                      className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity p-1"
                      title="Delete Note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {note.selected_text && (
                  <p className="text-[11px] italic text-neutral-500 dark:text-neutral-400 line-clamp-2 border-l-2 border-neutral-300 dark:border-neutral-600 pl-2">
                    &quot;{note.selected_text}&quot;
                  </p>
                )}

                {editingNoteId === note.id ? (
                  <div className="space-y-1.5">
                    <textarea
                      value={editingContent}
                      onChange={(e) => handleEditChange(e.target.value, note.id)}
                      onBlur={() => handleFinishEdit(note.id)}
                      rows={3}
                      className="w-full p-2 text-xs rounded-lg border border-black/15 dark:border-white/20 bg-white dark:bg-[#161618] text-neutral-900 dark:text-white outline-none resize-none"
                      autoFocus
                    />
                    <div className="flex items-center justify-between text-[10px] text-neutral-400">
                      <span>Auto-saves on typing / blur</span>
                      <button
                        onClick={() => handleFinishEdit(note.id)}
                        className="font-medium text-neutral-900 dark:text-white hover:underline"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ) : (
                  <p
                    onClick={() => handleStartEdit(note)}
                    className="text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap leading-relaxed cursor-text hover:bg-black/[0.02] dark:hover:bg-white/[0.02] rounded p-0.5"
                    title="Click to edit"
                  >
                    {note.content}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
};
