'use client';

import React, { useState, useEffect } from 'react';
import { Navigation } from '@/components/common/Navigation';
import { MCQQuizView } from '@/components/study/MCQQuizView';
import { CheckCircle2, Sparkles, Filter } from 'lucide-react';
import { Question } from '@/types';

export default function PracticePage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/practice');
      const data = await res.json();
      if (data.success) {
        setQuestions(data.questions);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  return (
    <div className="flex h-screen bg-[var(--bg)] text-[var(--fg)] overflow-hidden">
      <Navigation />

      <main className="flex-1 h-screen overflow-y-auto p-6 md:p-12 pb-24 max-w-4xl mx-auto space-y-8">
        <header className="pb-4 border-b border-black/5 dark:border-white/10">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-neutral-400" />
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Practice Examination (MCQ Mode)
            </h1>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Questions test comprehension directly from curriculum pages. Every attempt is analyzed to pinpoint weak areas.
          </p>
        </header>

        {loading ? (
          <div className="py-24 text-center text-xs text-neutral-400">
            Loading practice questions...
          </div>
        ) : (
          <MCQQuizView questions={questions} onRefresh={fetchQuestions} />
        )}
      </main>
    </div>
  );
}
