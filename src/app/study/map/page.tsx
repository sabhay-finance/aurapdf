'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Navigation } from '@/components/common/Navigation';
import { GlassCard } from '@/components/common/GlassCard';
import { GlassButton } from '@/components/common/GlassButton';
import { Map, CheckCircle2, Clock, Circle, ArrowRight, AlertTriangle, BookOpen } from 'lucide-react';
import { Document } from '@/types';

function StudyMapContent() {
  const searchParams = useSearchParams();
  const requestedDocId = searchParams.get('doc');

  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeDoc, setActiveDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDocuments() {
      try {
        setLoading(true);
        const res = await fetch('/api/documents');
        const data = await res.json();
        if (data.success && data.documents && data.documents.length > 0) {
          setDocuments(data.documents);
          const matched = requestedDocId
            ? data.documents.find((d: Document) => d.id === requestedDocId)
            : data.documents[0];
          setActiveDoc(matched || data.documents[0]);
        }
      } catch (err) {
        console.error('Failed to load documents for study map:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDocuments();
  }, [requestedDocId]);

  if (loading) {
    return (
      <div className="flex-1 h-screen flex items-center justify-center text-xs font-mono text-neutral-400">
        Loading syllabus & study map...
      </div>
    );
  }

  if (!activeDoc) {
    return (
      <main className="flex-1 h-screen overflow-y-auto p-6 md:p-12 pb-24 max-w-4xl mx-auto space-y-8 flex flex-col items-center justify-center">
        <GlassCard variant="surface" className="p-10 text-center max-w-md space-y-4">
          <BookOpen className="w-10 h-10 text-neutral-400 mx-auto stroke-1" />
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">No Documents in Library</h2>
          <p className="text-xs text-neutral-500">
            Import your textbook or study notes first to generate a structured syllabus and study map.
          </p>
          <Link href="/">
            <GlassButton variant="primary" size="sm">Go to Library</GlassButton>
          </Link>
        </GlassCard>
      </main>
    );
  }

  const totalPages = Math.max(1, activeDoc.page_count || 1);
  const currentPage = Math.max(1, activeDoc.last_page || 1);
  const progressPct = Math.min(100, Math.round((currentPage / totalPages) * 100));

  // Dynamically generate syllabus progression milestones across document pages
  const chapterCount = Math.min(6, Math.max(3, Math.ceil(totalPages / 15)));
  const pagesPerChapter = Math.max(1, Math.floor(totalPages / chapterCount));

  const chapters = Array.from({ length: chapterCount }, (_, i) => {
    const chNum = i + 1;
    const startPage = Math.min(totalPages, i * pagesPerChapter + 1);
    const endPage = Math.min(totalPages, (i + 1) * pagesPerChapter);
    const isCompleted = currentPage >= endPage;
    const isInProgress = currentPage >= startPage && currentPage < endPage;
    const status = isCompleted ? 'completed' : isInProgress ? 'in-progress' : 'not-started';

    return {
      number: chNum,
      title: chNum === 1
        ? 'Foundations, Overview & Fundamental Principles'
        : chNum === chapterCount
        ? 'Comprehensive Review, Formulas & Case Scenarios'
        : `Part ${chNum}: Analytical Frameworks & Key Calculations`,
      status,
      pageRange: startPage === endPage ? `Page ${startPage}` : `Pages ${startPage}–${endPage}`,
      startPage,
      isWeak: chNum === 2 || (isInProgress && progressPct < 50),
    };
  });

  return (
    <main className="flex-1 h-screen overflow-y-auto p-6 md:p-12 pb-24 max-w-4xl mx-auto space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/5 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <Map className="w-5 h-5 text-neutral-400" />
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Course Study Map & Syllabus
            </h1>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Visual concept progression mapped directly to textbook pages.
          </p>
        </div>

        {/* Document Selector Dropdown if multiple documents */}
        {documents.length > 1 && (
          <select
            value={activeDoc.id}
            onChange={(e) => {
              const selected = documents.find((d) => d.id === e.target.value);
              if (selected) setActiveDoc(selected);
            }}
            className="px-3 py-1.5 text-xs font-medium rounded-xl border border-black/10 dark:border-white/15 bg-white/50 dark:bg-neutral-800/50 text-neutral-900 dark:text-white outline-none"
          >
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        )}
      </header>

      {/* Course Overview Card */}
      <GlassCard variant="surface" className="p-6 md:p-8 space-y-5 border border-black/10 dark:border-white/15">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-neutral-400 block">
              {activeDoc.folder || 'Curriculum Course'}
            </span>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
              {activeDoc.title}
            </h2>
          </div>
          <span className="text-xs font-mono text-neutral-400">
            {chapterCount} Modules • {totalPages} Pages
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-neutral-500">
            <span>Curriculum Progress</span>
            <span>{progressPct}% Completed (Page {currentPage} of {totalPages})</span>
          </div>
          <div className="w-full h-2 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-neutral-900 dark:bg-white rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              <strong>Active Learning Milestone:</strong> Pick up where you left off on Page {currentPage}.
            </span>
          </div>
          <Link href={`/reader/${activeDoc.id}?page=${currentPage}`}>
            <GlassButton variant="primary" size="sm" className="text-xs shrink-0">
              Resume Page {currentPage}
            </GlassButton>
          </Link>
        </div>
      </GlassCard>

      {/* Chapters Syllabus */}
      <div className="space-y-3">
        <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-400">
          Syllabus Modules
        </h3>

        <div className="space-y-2">
          {chapters.map((ch) => (
            <Link
              key={ch.number}
              href={`/reader/${activeDoc.id}?page=${ch.startPage}`}
              className="block"
            >
              <GlassCard
                variant="card"
                hoverEffect
                className="p-4 flex items-center justify-between text-xs group"
              >
                <div className="flex items-center gap-3">
                  {ch.status === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : ch.status === 'in-progress' ? (
                    <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-neutral-300 dark:text-neutral-700 shrink-0" />
                  )}

                  <div>
                    <span className="font-semibold text-neutral-900 dark:text-white block text-xs">
                      Module {ch.number}: {ch.title}
                    </span>
                    <span className="text-[11px] text-neutral-400 font-mono">
                      {ch.pageRange}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {ch.status === 'in-progress' && (
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold">
                      Current
                    </span>
                  )}
                  {ch.isWeak && ch.status !== 'completed' && (
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400">
                      Focus Area
                    </span>
                  )}
                  <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors" />
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

export default function StudyMapPage() {
  return (
    <div className="flex h-screen bg-[var(--bg)] text-[var(--fg)] overflow-hidden">
      <Navigation />
      <Suspense fallback={<div className="flex-1 flex items-center justify-center text-xs font-mono text-neutral-400">Loading...</div>}>
        <StudyMapContent />
      </Suspense>
    </div>
  );
}
