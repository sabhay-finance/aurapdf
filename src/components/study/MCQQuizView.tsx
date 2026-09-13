'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, XCircle, ArrowRight, BookOpen, AlertCircle, RefreshCw, Sparkles } from 'lucide-react';
import { GlassCard } from '@/components/common/GlassCard';
import { GlassButton } from '@/components/common/GlassButton';
import { Question } from '@/types';

interface MCQQuizViewProps {
  questions: Question[];
  onRefresh: () => void;
}

export const MCQQuizView: React.FC<MCQQuizViewProps> = ({ questions, onRefresh }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedKey, setSelectedKey] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [isChecked, setIsChecked] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleGenerateMCQs = async () => {
    try {
      setGenerating(true);
      const docsRes = await fetch('/api/documents');
      const docsData = await docsRes.json();
      if (docsData.success && docsData.documents?.length > 0) {
        const doc = docsData.documents[0];
        await fetch('/api/ai/generate-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            document_id: doc.id,
            page_number: doc.last_page || 1,
            count: 3,
            difficulty: 'standard',
            saveToDatabase: true,
          }),
        });
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  if (!questions.length) {
    return (
      <GlassCard variant="surface" className="p-12 text-center max-w-lg mx-auto space-y-5">
        <CheckCircle2 className="w-10 h-10 text-neutral-400 mx-auto stroke-1" />
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
            No Practice Questions Found
          </h3>
          <p className="text-xs text-neutral-500">
            Open your textbook reader and use &quot;Make MCQ&quot; on any section, or generate custom exam questions with AI right now.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <GlassButton
            variant="primary"
            size="sm"
            disabled={generating}
            onClick={handleGenerateMCQs}
            className="gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{generating ? 'Generating Quiz...' : 'Generate Practice Quiz'}</span>
          </GlassButton>
          <Link href="/">
            <GlassButton variant="default" size="sm" className="gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Go to Reader</span>
            </GlassButton>
          </Link>
        </div>
      </GlassCard>
    );
  }

  const currentQuestion = questions[currentIndex];

  const handleCheck = async () => {
    if (!selectedKey || submitting) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/practice/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: currentQuestion.id,
          selected_answer: selectedKey,
          time_taken: 20,
        }),
      });
      const data = await res.json();
      setResult(data);
      setIsChecked(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    setIsChecked(false);
    setSelectedKey(null);
    setResult(null);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onRefresh();
      setCurrentIndex(0);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between text-xs font-mono text-neutral-500">
        <span className="uppercase tracking-wider">{currentQuestion.topic}</span>
        <span>Question {currentIndex + 1} / {questions.length}</span>
      </div>

      <GlassCard variant="surface" className="p-6 md:p-8 space-y-6 shadow-xl border border-black/10 dark:border-white/15">
        {/* Question text */}
        <h3 className="text-lg md:text-xl font-semibold tracking-tight text-neutral-900 dark:text-white leading-relaxed">
          {currentQuestion.question}
        </h3>

        {/* 4 Radio Options */}
        <div className="space-y-2.5">
          {currentQuestion.options.map((opt) => {
            const isSelected = selectedKey === opt.key;
            let optionStyle = 'border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5';

            if (isChecked) {
              if (opt.key === currentQuestion.correct_answer) {
                optionStyle = 'border-emerald-500 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200 font-semibold';
              } else if (isSelected && !result?.correct) {
                optionStyle = 'border-red-500 bg-red-500/10 text-red-950 dark:text-red-200';
              } else {
                optionStyle = 'opacity-40 border-transparent';
              }
            } else if (isSelected) {
              optionStyle = 'border-neutral-900 dark:border-white bg-black/10 dark:bg-white/15 font-semibold';
            }

            return (
              <button
                key={opt.key}
                disabled={isChecked}
                onClick={() => setSelectedKey(opt.key)}
                className={`w-full p-4 rounded-xl border text-left text-xs md:text-sm flex items-start gap-3 transition-all ${optionStyle}`}
              >
                <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs font-mono shrink-0">
                  {opt.key}
                </span>
                <span className="flex-1 leading-normal">{opt.text}</span>
              </button>
            );
          })}
        </div>

        {/* Action Button */}
        {!isChecked ? (
          <GlassButton
            variant="primary"
            size="md"
            disabled={!selectedKey || submitting}
            onClick={handleCheck}
            className="w-full justify-center py-3 text-xs"
          >
            Check Answer
          </GlassButton>
        ) : (
          <div className="space-y-4 pt-2 border-t border-black/5 dark:border-white/10 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-sm font-semibold">
              {result?.correct ? (
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" /> Correct Answer!
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                  <XCircle className="w-5 h-5" /> Incorrect (Correct: {currentQuestion.correct_answer})
                </span>
              )}
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed bg-black/5 dark:bg-white/5 p-3.5 rounded-xl border border-black/5 dark:border-white/5">
              {currentQuestion.explanation}
            </p>

            <div className="flex items-center justify-between">
              <Link
                href={`/reader/${currentQuestion.document_id}`}
                className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white font-mono transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Review in PDF (Page {currentQuestion.source_page})</span>
                <ArrowRight className="w-3 h-3" />
              </Link>

              <GlassButton variant="primary" size="sm" onClick={handleNext}>
                {currentIndex < questions.length - 1 ? 'Next Question →' : 'Complete Quiz'}
              </GlassButton>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
};
