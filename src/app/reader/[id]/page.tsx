'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PDFViewerEngine } from '@/components/reader/PDFViewerEngine';
import { ReaderToolbar } from '@/components/reader/ReaderToolbar';
import { AISidebar } from '@/components/reader/AISidebar';
import { NotesPanel } from '@/components/reader/NotesPanel';
import { ThumbnailsBar } from '@/components/reader/ThumbnailsBar';
import { SearchModal } from '@/components/reader/SearchModal';
import { StudySessionBar } from '@/components/reader/StudySessionBar';
import { CommandPalette } from '@/components/common/CommandPalette';
import { SettingsModal } from '@/components/common/SettingsModal';
import { GlassCard } from '@/components/common/GlassCard';
import { GlassButton } from '@/components/common/GlassButton';
import { AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Document, Annotation, Note } from '@/types';
import { useSession } from 'next-auth/react';
import { AudioTutorBar } from '@/components/reader/AudioTutorBar';
import { CheatSheetModal } from '@/components/study/CheatSheetModal';
import { SocraticVivaModal } from '@/components/study/SocraticVivaModal';

export default function ReaderPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const documentId = resolvedParams.id;
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const userKey = session?.user?.id || 'guest';

  const [document, setDocument] = useState<Document | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoom, setZoom] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [isTwoPage, setIsTwoPage] = useState(false);
  const [activeAnnotationTool, setActiveAnnotationTool] = useState<'none' | 'highlight' | 'pen' | 'eraser'>('none');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  // UI Drawer & Modal states
  const [isAIOpen, setIsAIOpen] = useState(searchParams.get('ai') === 'true');
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isThumbnailsOpen, setIsThumbnailsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [aiBannerDismissed, setAiBannerDismissed] = useState(false);

  // Million-Dollar Study Features
  const [isAudioTutorOpen, setIsAudioTutorOpen] = useState(false);
  const [isCheatSheetOpen, setIsCheatSheetOpen] = useState(false);
  const [isVivaOpen, setIsVivaOpen] = useState(false);
  const [isBionicReading, setIsBionicReading] = useState(false);

  // Context for AI / Notes from selection
  const [contextSelectedText, setContextSelectedText] = useState<string | undefined>(undefined);
  const [initialAIQuery, setInitialAIQuery] = useState<string | undefined>(undefined);

  // Auto-hide controls when idle
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Responsive two-page detection on desktop
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDesktop = window.innerWidth >= 1024;
      const storedLayout = localStorage.getItem('aura_page_layout');
      setIsTwoPage(storedLayout === 'two-page' || (isDesktop && storedLayout !== 'single-page'));
    }
  }, []);

  // Toast notification helper
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const saveDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const totalPagesRef = useRef(1);

  useEffect(() => {
    totalPagesRef.current = totalPages;
  }, [totalPages]);

  // Fetch document details & annotations
  useEffect(() => {
    async function loadData() {
      try {
        setError(null);
        const res = await fetch(`/api/documents/${documentId}?increment_view=true`);
        const data = await res.json();
        if (data.success && data.document) {
          setDocument(data.document);

          // Fast local restoration with DB fallback (scoped per user)
          const cachedPage = typeof window !== 'undefined'
            ? parseInt(localStorage.getItem(`aura_last_page_${userKey}_${documentId}`) || localStorage.getItem(`aura_last_page_${documentId}`) || '', 10)
            : NaN;
          const initialPage = !isNaN(cachedPage) && cachedPage >= 1
            ? cachedPage
            : (data.document.last_page || 1);

          const docPages = Math.max(1, data.document.page_count || 1);
          setCurrentPage(initialPage);
          setTotalPages(docPages);
          totalPagesRef.current = docPages;

          if (data.document.annotations) setAnnotations(data.document.annotations);
          if (data.document.notes) setNotes(data.document.notes);
        } else {
          setError(data.error || 'Document not found or has been removed.');
        }
      } catch (err: any) {
        console.error('Error loading document:', err);
        setError(err.message || 'Failed to connect to document server.');
      }
    }
    loadData();
  }, [documentId, userKey]);

  // Persist reading position (debounced & clamped, scoped per user)
  const saveReadingPosition = (page: number) => {
    const maxPages = totalPagesRef.current > 1 ? totalPagesRef.current : 99999;
    const clampedPage = Math.max(1, Math.min(maxPages, page));
    setCurrentPage(clampedPage);

    // 1. Instant local persistence for zero-delay restoration
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`aura_last_page_${userKey}_${documentId}`, String(clampedPage));
        localStorage.setItem(`aura_last_page_${documentId}`, String(clampedPage));
      } catch {}
    }

    // 2. Debounced database persistence (350ms)
    if (saveDebounceTimerRef.current) clearTimeout(saveDebounceTimerRef.current);
    saveDebounceTimerRef.current = setTimeout(() => {
      fetch(`/api/documents/${documentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ last_page: clampedPage, last_opened_at: new Date() }),
      }).catch(console.error);
    }, 350);
  };

  // Auto-hide controls on inactivity
  const handleUserActivity = () => {
    setIsControlsVisible(true);
    if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    idleTimeoutRef.current = setTimeout(() => {
      // Keep visible if a panel or modal is open
      if (
        !isAIOpen &&
        !isNotesOpen &&
        !isThumbnailsOpen &&
        !isSearchOpen &&
        !isAudioTutorOpen &&
        !isCheatSheetOpen &&
        !isVivaOpen
      ) {
        setIsControlsVisible(false);
      }
    }, 2800);
  };

  useEffect(() => {
    handleUserActivity();
    return () => {
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    };
  }, [isAIOpen, isNotesOpen, isThumbnailsOpen, isSearchOpen]);

  // Undo & Redo stacks for annotations (highlights, ink)
  const [undoStack, setUndoStack] = useState<Annotation[]>([]);
  const [redoStack, setRedoStack] = useState<Annotation[]>([]);

  // Ref to always access latest state in event listeners without re-subscribing
  const stateRef = useRef({ annotations, undoStack, redoStack, currentPage, totalPages, isTwoPage });
  stateRef.current = { annotations, undoStack, redoStack, currentPage, totalPages, isTwoPage };

  // Undo recent annotation
  const handleUndo = async () => {
    const { annotations: currentAnnos, undoStack: currentUndo } = stateRef.current;
    const target =
      currentUndo.length > 0
        ? currentUndo[currentUndo.length - 1]
        : currentAnnos[currentAnnos.length - 1];

    if (!target) {
      showToast('Nothing to undo');
      return;
    }

    try {
      await fetch(`/api/annotations?id=${target.id}`, { method: 'DELETE' });
      setAnnotations((prev) => prev.filter((a) => a.id !== target.id));
      setUndoStack((prev) => prev.filter((a) => a.id !== target.id));
      setRedoStack((prev) => [...prev, target]);
      showToast(`Undid ${target.type === 'highlight' ? 'highlight' : 'annotation'}`);
    } catch (err) {
      console.error('Error undoing annotation:', err);
    }
  };

  // Redo recent undone annotation
  const handleRedo = async () => {
    const { redoStack: currentRedo } = stateRef.current;
    if (currentRedo.length === 0) {
      showToast('Nothing to redo');
      return;
    }

    const target = currentRedo[currentRedo.length - 1];
    try {
      const res = await fetch('/api/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: target.document_id,
          user_id: target.user_id,
          page_number: target.page_number,
          type: target.type,
          coordinates: target.coordinates,
          color: target.color,
          content: target.content,
        }),
      });
      const data = await res.json();
      if (data.success && data.annotation) {
        setAnnotations((prev) => [...prev, data.annotation]);
        setUndoStack((prev) => [...prev, data.annotation]);
        setRedoStack((prev) => prev.slice(0, -1));
        showToast(`Restored ${target.type === 'highlight' ? 'highlight' : 'annotation'}`);
      }
    } catch (err) {
      console.error('Error redoing annotation:', err);
    }
  };

  // Keyboard navigation & annotation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      // Undo: Cmd+Z or Ctrl+Z (without shift)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Cmd+Shift+Z or Ctrl+Shift+Z or Ctrl+Y
      if (
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && e.shiftKey) ||
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y')
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      } else if (e.key === 'ArrowRight' || (e.key === ' ' && !e.shiftKey)) {
        e.preventDefault();
        const { currentPage: cp, totalPages: tp, isTwoPage: tpMode } = stateRef.current;
        if (cp < tp) {
          saveReadingPosition(Math.min(tp, cp + (tpMode ? 2 : 1)));
        }
      } else if (e.key === 'ArrowLeft' || (e.key === ' ' && e.shiftKey)) {
        e.preventDefault();
        const { currentPage: cp, isTwoPage: tpMode } = stateRef.current;
        if (cp > 1) {
          saveReadingPosition(Math.max(1, cp - (tpMode ? 2 : 1)));
        }
      } else if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsNotesOpen((prev) => !prev);
      } else if (e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setActiveAnnotationTool((prev) => (prev === 'highlight' ? 'none' : 'highlight'));
      } else if (e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setActiveAnnotationTool((prev) => (prev === 'pen' ? 'none' : 'pen'));
      } else if (e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setActiveAnnotationTool((prev) => (prev === 'eraser' ? 'none' : 'eraser'));
      } else if (e.key === 'Escape') {
        setIsAIOpen(false);
        setIsNotesOpen(false);
        setIsThumbnailsOpen(false);
        setIsSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Annotation handlers
  const handleAddAnnotation = async (anno: Omit<Annotation, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const res = await fetch('/api/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(anno),
      });
      const data = await res.json();
      if (data.success && data.annotation) {
        setAnnotations((prev) => [...prev, data.annotation]);
        setUndoStack((prev) => [...prev, data.annotation]);
        setRedoStack([]); // reset redo on new action
        if (anno.type === 'highlight') {
          showToast('Highlighted text (⌘Z to undo)');
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAnnotation = async (id: string) => {
    try {
      const target = annotations.find((a) => a.id === id);
      await fetch(`/api/annotations?id=${id}`, { method: 'DELETE' });
      setAnnotations((prev) => prev.filter((a) => a.id !== id));
      setUndoStack((prev) => prev.filter((a) => a.id !== id));
      if (target) {
        setRedoStack((prev) => [...prev, target]);
        showToast(`Erased ${target.type === 'highlight' ? 'highlight' : 'annotation'} (⌘Z to restore)`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Note handlers
  const handleAddNote = async (content: string, pageNumber: number, selectedText?: string) => {
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: documentId,
          page_number: pageNumber,
          content,
          selected_text: selectedText,
        }),
      });
      const data = await res.json();
      if (data.success && data.note) {
        setNotes((prev) => [data.note, ...prev]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await fetch(`/api/notes?id=${id}`, { method: 'DELETE' });
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateNote = async (id: string, content: string) => {
    try {
      const res = await fetch('/api/notes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, content }),
      });
      const data = await res.json();
      if (data.success && data.note) {
        setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, content } : n)));
      }
    } catch (err) {
      console.error('Error updating note:', err);
    }
  };

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center p-4 bg-[var(--bg)]">
        <GlassCard variant="surface" className="max-w-md p-8 text-center space-y-5 border border-red-500/20 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Document Not Found
            </h2>
            <p className="text-xs text-neutral-500 leading-relaxed">
              {error}
            </p>
          </div>
          <GlassButton
            variant="primary"
            size="md"
            className="w-full justify-center gap-2"
            onClick={() => router.push('/')}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Library</span>
          </GlassButton>
        </GlassCard>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg)] text-neutral-500 text-xs font-mono">
        Loading document reader...
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden flex flex-col bg-[var(--bg)]">
      {/* Floating Reader Toolbar */}
      <ReaderToolbar
        title={document.title}
        currentPage={currentPage}
        totalPages={totalPages}
        zoom={zoom}
        isTwoPage={isTwoPage}
        isVisible={isControlsVisible}
        activeAnnotationTool={activeAnnotationTool}
        isAIOpen={isAIOpen}
        isNotesOpen={isNotesOpen}
        isThumbnailsOpen={isThumbnailsOpen}
        canUndo={undoStack.length > 0 || annotations.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onPageChange={saveReadingPosition}
        onZoomChange={setZoom}
        onToggleTwoPage={() => setIsTwoPage(!isTwoPage)}
        onRotate={() => setRotation((prev) => (prev + 90) % 360)}
        onToggleFullscreen={() => {
          if (!window.document.fullscreenElement) {
            window.document.documentElement.requestFullscreen();
          } else {
            window.document.exitFullscreen();
          }
        }}
        onToggleAI={() => setIsAIOpen(!isAIOpen)}
        onToggleNotes={() => setIsNotesOpen(!isNotesOpen)}
        onToggleThumbnails={() => setIsThumbnailsOpen(!isThumbnailsOpen)}
        onToggleSearch={() => setIsSearchOpen(true)}
        onSetAnnotationTool={setActiveAnnotationTool}
        fileUrl={document.file_url}
        isAudioTutorOpen={isAudioTutorOpen}
        onToggleAudioTutor={() => setIsAudioTutorOpen((prev) => !prev)}
        onOpenCheatSheet={() => setIsCheatSheetOpen(true)}
        onOpenViva={() => setIsVivaOpen(true)}
        isBionicReading={isBionicReading}
        onToggleBionic={() => setIsBionicReading((prev) => !prev)}
      />

      {/* Non-blocking AI degradation notification */}
      {document.ai_indexing_status === 'failed' && !aiBannerDismissed && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 max-w-lg w-[90%] bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 backdrop-blur-md rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 shadow-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
            <span>PDF reading and annotations are fully active. Semantic AI indexing is temporarily offline for this file.</span>
          </div>
          <button
            onClick={() => setAiBannerDismissed(true)}
            className="text-amber-700 dark:text-amber-300 hover:opacity-75 ml-3 font-bold text-sm shrink-0"
            title="Dismiss notice"
          >
            ✕
          </button>
        </div>
      )}

      {/* Study Session Widget */}
      <StudySessionBar
        documentId={documentId}
        documentTitle={document.title}
        currentPage={currentPage}
        isRightSidebarOpen={isAIOpen || isNotesOpen}
      />

      {/* Thumbnails Drawer */}
      <ThumbnailsBar
        isOpen={isThumbnailsOpen}
        onClose={() => setIsThumbnailsOpen(false)}
        currentPage={currentPage}
        totalPages={totalPages}
        onSelectPage={(page) => {
          saveReadingPosition(page);
          setIsThumbnailsOpen(false);
        }}
      />

      {/* Core PDF.js Viewport (dynamically shifts/scales to prevent any sidebar overlap) */}
      <main
        className={`flex-1 h-screen overflow-hidden relative transition-[margin] duration-300 ease-out ${
          isAIOpen || isNotesOpen ? 'mr-0 md:mr-[380px] lg:mr-[420px]' : 'mr-0'
        }`}
      >
        <PDFViewerEngine
          documentId={documentId}
          fileUrl={document.file_url}
          initialPage={currentPage}
          currentPage={currentPage}
          zoom={zoom}
          rotation={rotation}
          isTwoPage={isTwoPage}
          isBionicReading={isBionicReading}
          activeAnnotationTool={activeAnnotationTool}
          annotations={annotations}
          notes={notes}
          onPageChange={(page, total) => {
            if (total && total > 0) {
              setTotalPages(total);
              totalPagesRef.current = total;
              if (document && document.page_count !== total) {
                fetch(`/api/documents/${documentId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ page_count: total }),
                }).catch(() => {});
              }
            }
            saveReadingPosition(page);
          }}
          onAddAnnotation={handleAddAnnotation}
          onDeleteAnnotation={handleDeleteAnnotation}
          onUserActivity={handleUserActivity}
          onOpenAIWithSelection={(text, pageNumber, mode) => {
            setContextSelectedText(text);
            if (mode === 'explain') {
              setInitialAIQuery(`Explain this concept in detail: "${text}"`);
            } else if (mode === 'simple') {
              setInitialAIQuery(`Explain this in simple terms: "${text}"`);
            } else if (mode === 'example') {
              setInitialAIQuery(`Give a real-world example of: "${text}"`);
            } else {
              setInitialAIQuery(text);
            }
            setIsAIOpen(true);
          }}
          onAddNoteFromSelection={(text, pageNumber) => {
            setContextSelectedText(text);
            setIsNotesOpen(true);
          }}
          onMakeFlashcardFromSelection={async (text, pageNumber) => {
            try {
              showToast('Generating flashcard with AI...');
              const apiKey = typeof window !== 'undefined' ? localStorage.getItem('aura_api_key') || undefined : undefined;
              const provider = typeof window !== 'undefined' ? localStorage.getItem('aura_ai_provider') || undefined : undefined;

              const res = await fetch('/api/ai/generate-flashcards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  document_id: documentId,
                  page_number: pageNumber,
                  selected_text: text,
                  count: 1,
                  apiKey,
                  provider,
                }),
              });
              const data = await res.json();
              if (data.success) {
                showToast('Flashcard generated & added to your study deck!');
              } else {
                showToast(`Failed: ${data.error || 'Error generating flashcard'}`);
              }
            } catch (err) {
              console.error(err);
              showToast('Network error while generating flashcard.');
            }
          }}
          onMakeMCQFromSelection={async (text, pageNumber) => {
            try {
              showToast('Generating practice question with AI...');
              const apiKey = typeof window !== 'undefined' ? localStorage.getItem('aura_api_key') || undefined : undefined;
              const provider = typeof window !== 'undefined' ? localStorage.getItem('aura_ai_provider') || undefined : undefined;

              const res = await fetch('/api/ai/generate-questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  document_id: documentId,
                  page_number: pageNumber,
                  selected_text: text,
                  count: 1,
                  apiKey,
                  provider,
                }),
              });
              const data = await res.json();
              if (data.success) {
                showToast('Practice question generated & added to quiz!');
              } else {
                showToast(`Failed: ${data.error || 'Error generating question'}`);
              }
            } catch (err) {
              console.error(err);
              showToast('Network error while generating question.');
            }
          }}
        />
      </main>

      {/* Contextual AI Sidebar (right side or bottom sheet on mobile) */}
      <AISidebar
        isOpen={isAIOpen}
        onClose={() => {
          setIsAIOpen(false);
          setContextSelectedText(undefined);
          setInitialAIQuery(undefined);
        }}
        documentId={documentId}
        documentTitle={document.title}
        currentPage={currentPage}
        isTwoPage={isTwoPage}
        selectedText={contextSelectedText}
        initialQuery={initialAIQuery}
        onNavigateToPage={(p) => saveReadingPosition(p)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Linked Study Notes Panel */}
      <NotesPanel
        isOpen={isNotesOpen}
        onClose={() => {
          setIsNotesOpen(false);
          setContextSelectedText(undefined);
        }}
        documentId={documentId}
        currentPage={currentPage}
        notes={notes}
        onAddNote={handleAddNote}
        onUpdateNote={handleUpdateNote}
        onDeleteNote={handleDeleteNote}
        onNavigateToPage={(p) => saveReadingPosition(p)}
        selectedText={contextSelectedText}
      />

      {/* In-Document Search (Exact & Semantic) */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        documentId={documentId}
        onNavigateToPage={(p) => saveReadingPosition(p)}
      />

      {/* Universal Command Palette (Cmd+K) */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        currentDocumentId={documentId}
        onJumpToPage={(p) => saveReadingPosition(p)}
        onOpenAI={(q) => {
          setInitialAIQuery(q);
          setIsAIOpen(true);
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* NotebookLM-Style Spoken Audio Tutor Bar */}
      <AudioTutorBar
        isOpen={isAudioTutorOpen}
        onClose={() => setIsAudioTutorOpen(false)}
        documentId={documentId}
        documentTitle={document.title}
        currentPage={currentPage}
      />

      {/* 1-Click High-Yield Cheat Sheet Modal */}
      <CheatSheetModal
        isOpen={isCheatSheetOpen}
        onClose={() => setIsCheatSheetOpen(false)}
        documentId={documentId}
        documentTitle={document.title}
        currentPage={currentPage}
      />

      {/* Socratic Oral Exam / Viva Mode Modal */}
      <SocraticVivaModal
        isOpen={isVivaOpen}
        onClose={() => setIsVivaOpen(false)}
        documentId={documentId}
        documentTitle={document.title}
        currentPage={currentPage}
      />

      {/* Dynamic Toast Feedback Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <GlassCard
            variant="pill"
            className="px-4 py-2.5 flex items-center gap-2.5 shadow-2xl border border-black/15 dark:border-white/20 bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 text-xs font-medium"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
