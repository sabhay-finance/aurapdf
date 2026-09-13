'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Navigation } from '@/components/common/Navigation';
import { HeroContinue } from '@/components/library/HeroContinue';
import { ImportDropzone } from '@/components/library/ImportDropzone';
import { DocumentCard } from '@/components/library/DocumentCard';
import { CommandPalette } from '@/components/common/CommandPalette';
import { SettingsModal } from '@/components/common/SettingsModal';
import { GlassButton } from '@/components/common/GlassButton';
import { Plus, Search, BookOpen, Sparkles, Filter, Folder } from 'lucide-react';
import { Document } from '@/types';

function LibraryContent() {
  const searchParams = useSearchParams();
  const viewParam = searchParams.get('view');

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'recent' | 'favorites' | 'folders'>('recent');
  const [showImport, setShowImport] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Sync tab with URL view parameter
  useEffect(() => {
    if (viewParam === 'all' || viewParam === 'favorites' || viewParam === 'recent' || viewParam === 'folders') {
      setActiveTab(viewParam);
    }
  }, [viewParam]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/documents');
      const data = await res.json();
      if (data.success) {
        setDocuments(data.documents);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning.';
    if (hour < 18) return 'Good afternoon.';
    return 'Good evening.';
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleFavorite = async (id: string, current: boolean) => {
    try {
      await fetch(`/api/documents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: !current }),
      });
      setDocuments((prev) =>
        prev.map((d) => (d.id === id ? { ...d, is_favorite: !current } : d))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === 'favorites') return matchesSearch && doc.is_favorite;
    return matchesSearch;
  });

  const recentDoc = documents.length > 0 ? documents[0] : null;

  return (
    <div className="flex h-screen bg-[var(--bg)] text-[var(--fg)] overflow-hidden">
      <Navigation
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenCommandPalette={() => setIsCommandOpen(true)}
      />

      {/* Main Library View */}
      <main className="flex-1 h-screen overflow-y-auto p-6 md:p-12 pb-24 md:pb-12 max-w-6xl mx-auto space-y-10">
        {/* Header greeting & top controls */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-neutral-900 dark:text-white">
              {getGreeting()}
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              Pick up where you left off or explore new concepts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <GlassButton
              variant="primary"
              size="md"
              onClick={() => setShowImport(!showImport)}
              className="rounded-xl px-4 py-2.5"
            >
              <Plus className="w-4 h-4" />
              <span>Import PDF</span>
            </GlassButton>

            <button
              onClick={() => setIsCommandOpen(true)}
              className="p-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 text-neutral-600 dark:text-neutral-300 transition-colors"
              title="Search and Commands (Cmd+K)"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Dropzone expandable */}
        {showImport && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-200">
            <ImportDropzone
              onImportSuccess={(newDoc) => {
                setShowImport(false);
                fetchDocuments();
              }}
            />
          </div>
        )}

        {/* Continue studying Hero card */}
        {recentDoc && (
          <section className="space-y-3">
            <HeroContinue document={recentDoc} />
          </section>
        )}

        {/* Documents Grid / Tabs */}
        <section className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/5 dark:border-white/10 pb-3">
            <div className="flex items-center gap-6 text-sm font-medium">
              <button
                onClick={() => setActiveTab('recent')}
                className={`pb-3 relative transition-colors ${
                  activeTab === 'recent'
                    ? 'text-neutral-900 dark:text-white font-semibold'
                    : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                }`}
              >
                Recent
                {activeTab === 'recent' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900 dark:bg-white rounded-full" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('all')}
                className={`pb-3 relative transition-colors ${
                  activeTab === 'all'
                    ? 'text-neutral-900 dark:text-white font-semibold'
                    : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                }`}
              >
                All Documents ({documents.length})
                {activeTab === 'all' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900 dark:bg-white rounded-full" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('favorites')}
                className={`pb-3 relative transition-colors ${
                  activeTab === 'favorites'
                    ? 'text-neutral-900 dark:text-white font-semibold'
                    : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                }`}
              >
                Favorites
                {activeTab === 'favorites' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900 dark:bg-white rounded-full" />
                )}
              </button>
            </div>

            {/* Quick search input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter library..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-neutral-900 dark:text-white placeholder-neutral-400 outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors"
              />
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-44 rounded-2xl bg-black/5 dark:bg-white/5 animate-pulse"
                />
              ))}
            </div>
          ) : filteredDocs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {filteredDocs.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  onDelete={handleDelete}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          ) : (
            <div className="py-16 text-center space-y-3">
              <BookOpen className="w-8 h-8 text-neutral-400 mx-auto stroke-1" />
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                No documents found in this view.
              </p>
              <GlassButton size="sm" onClick={() => setShowImport(true)}>
                Import your first PDF
              </GlassButton>
            </div>
          )}
        </section>
      </main>

      {/* Global Modals */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[var(--bg)] text-neutral-400 text-xs font-mono">Loading library...</div>}>
      <LibraryContent />
    </Suspense>
  );
}
