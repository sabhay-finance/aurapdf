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
import {
  Plus,
  Search,
  BookOpen,
  Sparkles,
  TrendingUp,
  Clock,
  Layers,
  Star,
  RefreshCw,
} from 'lucide-react';
import { Document } from '@/types';
import { getBrowserSupabase } from '@/lib/supabase';

const CATEGORIES = [
  'All Categories',
  'Computer Science',
  'Medicine & Health',
  'Mathematics',
  'Engineering',
  'Business & Economics',
  'Law & Humanities',
  'Natural Sciences',
  'General',
];

function LibraryContent() {
  const searchParams = useSearchParams();
  const viewParam = searchParams.get('view');

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'recent' | 'popular' | 'all' | 'favorites'>('recent');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [showImport, setShowImport] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Sync tab with URL view parameter
  useEffect(() => {
    if (viewParam === 'all' || viewParam === 'favorites' || viewParam === 'recent' || viewParam === 'popular') {
      setActiveTab(viewParam as any);
    }
  }, [viewParam]);

  const fetchDocuments = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const res = await fetch('/api/documents');
      const data = await res.json();
      if (data.success && Array.isArray(data.documents)) {
        setDocuments(data.documents);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Realtime multi-device sync via Supabase Realtime + window focus fallback
  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (supabase) {
      const channel = supabase
        .channel('aura_community_documents')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'documents' },
          () => {
            fetchDocuments(true);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      // Fallback polling every 25 seconds if Supabase keys aren't configured in client
      const interval = setInterval(() => fetchDocuments(true), 25000);
      return () => clearInterval(interval);
    }
  }, []);

  // Revalidate whenever the user returns/focuses the tab
  useEffect(() => {
    const onFocus = () => fetchDocuments(true);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning.';
    if (hour < 18) return 'Good afternoon.';
    return 'Good evening.';
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
      } else {
        alert(data.error || 'Failed to delete document');
      }
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

  // Filter and sort documents
  const filteredDocs = documents
    .filter((doc) => {
      const matchesSearch =
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.description && doc.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (doc.uploaded_by && doc.uploaded_by.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'All Categories' || doc.category === selectedCategory;

      if (activeTab === 'favorites') {
        return matchesSearch && matchesCategory && doc.is_favorite;
      }

      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (activeTab === 'popular') {
        const scoreA = (a.view_count || 0) * 1.5 + (a.download_count || 0) * 3;
        const scoreB = (b.view_count || 0) * 1.5 + (b.download_count || 0) * 3;
        return scoreB - scoreA;
      }
      if (activeTab === 'recent') {
        const timeA = new Date(a.uploaded_at || a.created_at).getTime();
        const timeB = new Date(b.uploaded_at || b.created_at).getTime();
        return timeB - timeA;
      }
      return 0; // default order
    });

  const recentDoc = documents.length > 0 ? documents[0] : null;

  return (
    <div className="flex h-screen bg-[var(--bg)] text-[var(--fg)] overflow-hidden">
      <Navigation
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenCommandPalette={() => setIsCommandOpen(true)}
      />

      {/* Main Library View */}
      <main className="flex-1 h-screen overflow-y-auto p-6 md:p-12 pb-24 md:pb-12 max-w-6xl mx-auto space-y-8">
        {/* Header greeting & top controls */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-neutral-900 dark:text-white">
              {getGreeting()}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <p className="text-sm text-neutral-500">
                AuraPDF Community Cloud • Discover, study, and share textbooks.
              </p>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Community Cloud Storage
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchDocuments(true)}
              className="p-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 text-neutral-600 dark:text-neutral-300 transition-colors"
              title="Refresh library"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

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
              onCancel={() => setShowImport(false)}
            />
          </div>
        )}

        {/* Continue studying Hero card */}
        {recentDoc && !searchQuery && selectedCategory === 'All Categories' && (
          <section className="space-y-3">
            <HeroContinue document={recentDoc} />
          </section>
        )}

        {/* Community Library Sections */}
        <section className="space-y-5">
          {/* Main Section Navigation Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/5 dark:border-white/10 pb-3">
            <div className="flex items-center gap-6 text-sm font-medium">
              <button
                onClick={() => setActiveTab('recent')}
                className={`flex items-center gap-1.5 pb-3 relative transition-colors ${
                  activeTab === 'recent'
                    ? 'text-neutral-900 dark:text-white font-semibold'
                    : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Recently Added</span>
                {activeTab === 'recent' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900 dark:bg-white rounded-full" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('popular')}
                className={`flex items-center gap-1.5 pb-3 relative transition-colors ${
                  activeTab === 'popular'
                    ? 'text-neutral-900 dark:text-white font-semibold'
                    : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Popular</span>
                {activeTab === 'popular' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900 dark:bg-white rounded-full" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('all')}
                className={`flex items-center gap-1.5 pb-3 relative transition-colors ${
                  activeTab === 'all'
                    ? 'text-neutral-900 dark:text-white font-semibold'
                    : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>All PDFs ({documents.length})</span>
                {activeTab === 'all' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900 dark:bg-white rounded-full" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('favorites')}
                className={`flex items-center gap-1.5 pb-3 relative transition-colors ${
                  activeTab === 'favorites'
                    ? 'text-neutral-900 dark:text-white font-semibold'
                    : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                }`}
              >
                <Star className="w-4 h-4" />
                <span>Favorites</span>
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
                placeholder="Search title, uploader..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-neutral-900 dark:text-white placeholder-neutral-400 outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors"
              />
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs shrink-0 transition-all ${
                  selectedCategory === cat
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-medium shadow-sm'
                    : 'bg-black/5 dark:bg-white/5 text-neutral-600 dark:text-neutral-300 hover:bg-black/10 dark:hover:bg-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Documents Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-48 rounded-2xl bg-black/5 dark:bg-white/5 animate-pulse"
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
                {searchQuery || selectedCategory !== 'All Categories'
                  ? 'No documents match your filter criteria.'
                  : 'No community documents yet.'}
              </p>
              <GlassButton size="sm" onClick={() => setShowImport(true)}>
                Upload the first document
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
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[var(--bg)] text-neutral-400 text-xs font-mono">
          Loading library...
        </div>
      }
    >
      <LibraryContent />
    </Suspense>
  );
}
