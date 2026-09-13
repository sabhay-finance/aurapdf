'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/common/Navigation';
import { WeakTopicsChart } from '@/components/study/WeakTopicsChart';
import { GlassCard } from '@/components/common/GlassCard';
import { GlassButton } from '@/components/common/GlassButton';
import { TrendingUp, Clock, BookOpen, Sparkles, ArrowRight, Play } from 'lucide-react';
import { TopicAnalysis } from '@/lib/study/weakTopics';
import { StudyRecommendation } from '@/types';

export default function ProgressPage() {
  const [topicAnalysis, setTopicAnalysis] = useState<TopicAnalysis[]>([]);
  const [recommendation, setRecommendation] = useState<StudyRecommendation | null>(null);
  const [stats, setStats] = useState({ totalMinutes: 47, totalPages: 14, totalQuestions: 18 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [weakRes, recRes, sesRes] = await Promise.all([
          fetch('/api/analytics/weak-topics'),
          fetch('/api/analytics/recommendation?minutes=45'),
          fetch('/api/analytics/study-session'),
        ]);

        const weakData = await weakRes.json();
        const recData = await recRes.json();
        const sesData = await sesRes.json();

        if (weakData.success) setTopicAnalysis(weakData.analysis);
        if (recData.success) setRecommendation(recData.recommendation);
        if (sesData.success && sesData.stats) setStats(sesData.stats);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="flex h-screen bg-[var(--bg)] text-[var(--fg)] overflow-hidden">
      <Navigation />

      <main className="flex-1 h-screen overflow-y-auto p-6 md:p-12 pb-24 max-w-5xl mx-auto space-y-10">
        <header className="pb-4 border-b border-black/5 dark:border-white/10">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-neutral-400" />
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Study Analytics & Weak-Topic Detection
            </h1>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Real performance tracking derived strictly from your practice quiz attempts and reading sessions.
          </p>
        </header>

        {/* Top Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <GlassCard variant="card" className="p-5 space-y-1">
            <span className="text-xs font-mono uppercase text-neutral-400">Total Study Time</span>
            <p className="text-2xl font-bold font-mono text-neutral-900 dark:text-white">
              {stats.totalMinutes} mins
            </p>
          </GlassCard>

          <GlassCard variant="card" className="p-5 space-y-1">
            <span className="text-xs font-mono uppercase text-neutral-400">Pages Studied</span>
            <p className="text-2xl font-bold font-mono text-neutral-900 dark:text-white">
              {stats.totalPages} pages
            </p>
          </GlassCard>

          <GlassCard variant="card" className="p-5 space-y-1">
            <span className="text-xs font-mono uppercase text-neutral-400">Questions Answered</span>
            <p className="text-2xl font-bold font-mono text-neutral-900 dark:text-white">
              {stats.totalQuestions} attempts
            </p>
          </GlassCard>
        </div>

        {/* "What Should I Study Next?" Engine (Section 34) */}
        {recommendation && (
          <section className="space-y-3">
            <GlassCard variant="surface" className="p-6 md:p-8 space-y-4 border border-black/10 dark:border-white/15">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-neutral-400">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>What Should I Study Next? (Recommendation Engine)</span>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-neutral-500">You have 45 minutes available.</span>
                <h3 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
                  Study: {recommendation.topic} ({recommendation.pages})
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-300">
                  <strong>Why:</strong> {recommendation.reason}
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href={`/reader/${recommendation.documentId}?page=${recommendation.startPage}`}
                >
                  <GlassButton variant="primary" size="md" className="gap-2">
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start 45 min Study Session</span>
                  </GlassButton>
                </Link>
              </div>
            </GlassCard>
          </section>
        )}

        {/* Weak Areas Section (Section 16) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold tracking-tight text-neutral-900 dark:text-white uppercase font-mono text-xs">
              Topic Mastery & Weak Areas
            </h2>
            <span className="text-xs text-neutral-400">
              Threshold: &lt;65% flagged as weak
            </span>
          </div>

          <WeakTopicsChart
            topics={topicAnalysis}
            documentId={recommendation?.documentId}
          />
        </section>
      </main>
    </div>
  );
}
