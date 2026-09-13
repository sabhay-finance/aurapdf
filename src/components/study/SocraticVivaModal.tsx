'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Send,
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  RotateCcw,
  Award,
  HelpCircle,
} from 'lucide-react';
import { GlassCard } from '@/components/common/GlassCard';

interface VivaEvaluation {
  score: number;
  status: 'mastered' | 'proficient' | 'needs-work';
  strengths: string[];
  blindspots: string[];
  expertAnswer: string;
  followUpQuestion?: string;
}

interface SocraticVivaModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle: string;
  currentPage?: number;
}

export const SocraticVivaModal: React.FC<SocraticVivaModalProps> = ({
  isOpen,
  onClose,
  documentId,
  documentTitle,
  currentPage = 1,
}) => {
  const [question, setQuestion] = useState<string>('');
  const [topic, setTopic] = useState<string>('');
  const [answer, setAnswer] = useState<string>('');
  const [loadingQuestion, setLoadingQuestion] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<VivaEvaluation | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
      loadNewQuestion();
    } else {
      stopListening();
      setEvaluation(null);
      setAnswer('');
    }
  }, [isOpen, documentId, currentPage]);

  const loadNewQuestion = async () => {
    setLoadingQuestion(true);
    setEvaluation(null);
    setAnswer('');
    stopListening();

    try {
      const apiKey = typeof window !== 'undefined' ? localStorage.getItem('aura_api_key') || undefined : undefined;
      const provider = typeof window !== 'undefined' ? localStorage.getItem('aura_ai_provider') || undefined : undefined;

      const res = await fetch('/api/ai/viva', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          document_id: documentId,
          page_number: currentPage,
          apiKey,
          provider,
        }),
      });

      const data = await res.json();
      if (data.success && data.viva) {
        setQuestion(data.viva.question);
        setTopic(data.viva.topic || `Page ${currentPage} Mastery`);
      } else {
        setQuestion(`Explain the core principle on Page ${currentPage} and how it relates to decision making.`);
        setTopic('Conceptual Understanding');
      }
    } catch (err) {
      console.error('Failed to load viva question:', err);
    } finally {
      setLoadingQuestion(false);
    }
  };

  const handleToggleVoice = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const startListening = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please type your response.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setAnswer(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
    } catch (err) {
      console.error('Speech recognition error:', err);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const handleSubmitAnswer = async () => {
    if (!answer.trim() || evaluating) return;
    stopListening();
    setEvaluating(true);

    try {
      const apiKey = typeof window !== 'undefined' ? localStorage.getItem('aura_api_key') || undefined : undefined;
      const provider = typeof window !== 'undefined' ? localStorage.getItem('aura_ai_provider') || undefined : undefined;

      const res = await fetch('/api/ai/viva', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'evaluate',
          document_id: documentId,
          page_number: currentPage,
          question,
          student_answer: answer,
          apiKey,
          provider,
        }),
      });

      const data = await res.json();
      if (data.success && data.evaluation) {
        setEvaluation(data.evaluation);
      }
    } catch (err) {
      console.error('Failed to evaluate viva response:', err);
    } finally {
      setEvaluating(false);
    }
  };

  const handleFollowUp = () => {
    if (!evaluation?.followUpQuestion) return;
    setQuestion(evaluation.followUpQuestion);
    setAnswer('');
    setEvaluation(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-[#121214] border border-black/15 dark:border-white/15 shadow-2xl text-neutral-900 dark:text-white overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-black/10 dark:border-white/10 flex items-center justify-between gap-3 bg-neutral-50/50 dark:bg-neutral-900/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Socratic Viva Voce (Oral Exam)
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium uppercase font-mono">
                  Active Recall
                </span>
              </div>
              <span className="text-xs text-neutral-500 block truncate max-w-sm">
                Page {currentPage} • {documentTitle}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs">
          {loadingQuestion ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3 text-neutral-400">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
              <p className="text-xs font-medium">Examiner is reviewing document context & preparing question...</p>
            </div>
          ) : (
            <>
              {/* The Examiner Question Card */}
              <div className="p-4 rounded-2xl border border-purple-500/20 bg-purple-500/5 dark:bg-purple-500/10 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-purple-700 dark:text-purple-300">
                  <span className="uppercase tracking-wider">Professor Inquires:</span>
                  <button
                    onClick={loadNewQuestion}
                    className="inline-flex items-center gap-1 hover:underline text-[10px] text-purple-600 dark:text-purple-400 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>New Question</span>
                  </button>
                </div>
                <h4 className="text-sm md:text-base font-semibold text-neutral-900 dark:text-white leading-relaxed">
                  {question}
                </h4>
              </div>

              {/* Student Response Area (Voice or Typed) */}
              {!evaluation && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span>Explain in your own words (or speak via microphone):</span>
                    {isListening && (
                      <span className="flex items-center gap-1 text-red-500 font-semibold animate-pulse text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        Listening...
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <textarea
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="Type your explanation here, or click the mic button to speak naturally..."
                      rows={5}
                      className="w-full p-3.5 pb-12 text-xs rounded-2xl border border-black/15 dark:border-white/20 bg-neutral-50 dark:bg-[#18181C] text-neutral-900 dark:text-white placeholder-neutral-400 outline-none focus:border-purple-500 leading-relaxed resize-none"
                    />

                    <div className="absolute bottom-3 right-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleToggleVoice}
                        className={`p-2 rounded-xl transition-all cursor-pointer ${
                          isListening
                            ? 'bg-red-500 text-white animate-bounce'
                            : 'bg-black/5 dark:bg-white/10 text-neutral-600 dark:text-neutral-300 hover:bg-black/10 dark:hover:bg-white/20'
                        }`}
                        title={isListening ? 'Stop recording' : 'Speak your answer'}
                      >
                        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={handleSubmitAnswer}
                        disabled={!answer.trim() || evaluating}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity shadow-xs cursor-pointer"
                      >
                        {evaluating ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Evaluating...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Submit for Viva Grading</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Evaluation Results Breakdown */}
              {evaluation && (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  {/* Score Banner */}
                  <div className="p-4 rounded-2xl border border-black/10 dark:border-white/15 bg-neutral-50/70 dark:bg-[#18181C] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">
                        Conceptual Mastery Score
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-neutral-900 dark:text-white">
                          {evaluation.score}%
                        </span>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                            evaluation.score >= 80
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : evaluation.score >= 60
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              : 'bg-red-500/10 text-red-600 dark:text-red-400'
                          }`}
                        >
                          {evaluation.status}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setEvaluation(null)}
                      className="px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/15 text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      Try Answering Again
                    </button>
                  </div>

                  {/* Strengths */}
                  {evaluation.strengths && evaluation.strengths.length > 0 && (
                    <div className="p-3.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 space-y-1.5">
                      <span className="font-bold text-[11px] text-emerald-700 dark:text-emerald-400 block uppercase tracking-wider">
                        ✅ What You Nailed:
                      </span>
                      <ul className="space-y-1">
                        {evaluation.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-neutral-700 dark:text-neutral-200">
                            <span className="text-emerald-500 font-bold shrink-0">•</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Blindspots */}
                  {evaluation.blindspots && evaluation.blindspots.length > 0 && (
                    <div className="p-3.5 rounded-2xl border border-amber-500/25 bg-amber-500/5 dark:bg-amber-500/10 space-y-1.5">
                      <span className="font-bold text-[11px] text-amber-700 dark:text-amber-400 block uppercase tracking-wider">
                        ⚠️ Key Gaps & Blindspots To Address:
                      </span>
                      <ul className="space-y-1">
                        {evaluation.blindspots.map((b, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-neutral-700 dark:text-neutral-200">
                            <span className="text-amber-500 font-bold shrink-0">→</span>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Ideal Model Answer */}
                  {evaluation.expertAnswer && (
                    <div className="p-3.5 rounded-2xl border border-black/10 dark:border-white/15 bg-black/5 dark:bg-white/5 space-y-1">
                      <span className="font-bold text-[11px] text-neutral-500 block uppercase tracking-wider">
                        💡 Professor Model Synthesis:
                      </span>
                      <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                        {evaluation.expertAnswer}
                      </p>
                    </div>
                  )}

                  {/* Adaptive Follow-Up Question Challenge */}
                  {evaluation.followUpQuestion && (
                    <div className="p-4 rounded-2xl border border-purple-500/30 bg-purple-500/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11px] text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                          🎯 Follow-Up Examiner Challenge:
                        </span>
                      </div>
                      <p className="font-medium text-neutral-900 dark:text-white">
                        {evaluation.followUpQuestion}
                      </p>
                      <button
                        onClick={handleFollowUp}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition-colors cursor-pointer"
                      >
                        <span>Answer Follow-up Challenge</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
