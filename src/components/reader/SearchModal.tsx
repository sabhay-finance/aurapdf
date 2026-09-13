'use client';

import React, { useState } from 'react';
import { Search, Sparkles, BookOpen, X, ArrowRight, Loader2 } from 'lucide-react';
import { GlassCard } from '@/components/common/GlassCard';

interface SearchResult {
  pageNumber: number;
  snippet: string;
  score?: number;
  matchType: 'exact' | 'semantic';
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  onNavigateToPage: (page: number) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  documentId,
  onNavigateToPage,
}) => {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'exact' | 'semantic'>('exact');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    try {
      setSearching(true);
      const res = await fetch(`/api/documents/${documentId}/search?q=${encodeURIComponent(query)}&mode=${mode}`);
      const data = await res.json();

      if (data.success && Array.isArray(data.results)) {
        setResults(data.results);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/60 backdrop-blur-md">
      <div
        className="w-full max-w-xl p-0 rounded-2xl overflow-hidden shadow-2xl border border-black/15 dark:border-white/20 bg-white dark:bg-[#121214] text-neutral-900 dark:text-white flex flex-col"
      >
        <form
          onSubmit={handleSearch}
          className="flex items-center px-4 py-3 border-b border-black/10 dark:border-white/10 gap-3"
        >
          <Search className="w-5 h-5 text-neutral-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              mode === 'exact'
                ? 'Exact keyword search in PDF text...'
                : 'Semantic concept search (e.g. capital budgeting methods)...'
            }
            className="flex-1 bg-transparent border-none outline-none text-neutral-900 dark:text-white placeholder-neutral-400 text-sm font-medium"
            autoFocus
          />
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </form>

        {/* Search Mode switcher */}
        <div className="flex items-center gap-2 px-4 py-2 bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/10 text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              setMode('exact');
              setResults([]);
            }}
            className={`px-3 py-1 rounded-lg transition-colors ${
              mode === 'exact'
                ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs font-semibold'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            Exact PDF Search
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('semantic');
              setResults([]);
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors ${
              mode === 'semantic'
                ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs font-semibold'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <Sparkles className="w-3 h-3 text-neutral-400" />
            <span>Semantic Concept Search</span>
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {searching ? (
            <div className="flex items-center justify-center gap-2 py-8 text-neutral-400 text-xs">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Searching document...</span>
            </div>
          ) : results.length > 0 ? (
            results.map((res, i) => (
              <button
                key={i}
                onClick={() => {
                  onNavigateToPage(res.pageNumber);
                  onClose();
                }}
                className="w-full p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-left text-xs transition-colors group flex items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-900 dark:text-white font-mono">
                      Page {res.pageNumber}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-neutral-500">
                      {res.matchType}
                    </span>
                  </div>
                  <p className="text-neutral-600 dark:text-neutral-400 line-clamp-2">
                    {res.snippet}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white shrink-0 mt-1" />
              </button>
            ))
          ) : query ? (
            <div className="py-8 text-center text-xs text-neutral-400">
              No results found for &quot;{query}&quot;. Try different keywords.
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-neutral-400">
              Type keywords above and press Enter to search across all pages.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
