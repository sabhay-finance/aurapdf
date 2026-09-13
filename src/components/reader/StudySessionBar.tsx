'use client';

import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, Clock, Award, CheckCircle2, ArrowRight } from 'lucide-react';
import { GlassCard } from '@/components/common/GlassCard';
import { GlassButton } from '@/components/common/GlassButton';

interface StudySessionBarProps {
  documentId: string;
  documentTitle: string;
  currentPage: number;
  isRightSidebarOpen?: boolean;
}

export const StudySessionBar: React.FC<StudySessionBarProps> = ({
  documentId,
  documentTitle,
  currentPage,
  isRightSidebarOpen = false,
}) => {
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [targetMinutes, setTargetMinutes] = useState(25);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [startPage, setStartPage] = useState(currentPage);
  const [showSummary, setShowSummary] = useState(false);
  const [completedSession, setCompletedSession] = useState<any>(null);

  useEffect(() => {
    let timer: any;
    if (isActive && !isPaused) {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isActive, isPaused]);

  const handleStart = (mins: number) => {
    setTargetMinutes(mins);
    setElapsedSeconds(0);
    setStartPage(currentPage);
    setIsActive(true);
    setIsPaused(false);
  };

  const handleEnd = async () => {
    const pagesRead = Math.max(1, Math.abs(currentPage - startPage) + 1);
    const duration = elapsedSeconds;

    try {
      await fetch('/api/analytics/study-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: documentId,
          pages_read: pagesRead,
          duration_seconds: duration,
          questions_done: 0,
          flashcards_done: 0,
        }),
      });
      setCompletedSession({
        durationMinutes: Math.max(1, Math.round(duration / 60)),
        pagesRead,
        questionsDone: 0,
        flashcardsDone: 0,
      });
      setShowSummary(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsActive(false);
      setIsPaused(false);
      setElapsedSeconds(0);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* Mini floating timer widget on reader screen (shifts left when right sidebar is open) */}
      <div
        className={`fixed top-20 z-30 select-none transition-all duration-300 ${
          isRightSidebarOpen ? 'right-4 md:right-[436px]' : 'right-4'
        }`}
      >
        {!isActive ? (
          <div className="group relative">
            <GlassCard
              variant="pill"
              className="px-3 py-1.5 flex items-center gap-2 cursor-pointer shadow-md hover:border-black/20 dark:hover:border-white/20 transition-all text-xs text-neutral-700 dark:text-neutral-200 bg-white/95 dark:bg-[#18181C]/95 border border-black/10 dark:border-white/20"
            >
              <Clock className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
              <span>Study Session</span>
            </GlassCard>

            {/* Hover popup with duration options */}
            <div className="hidden group-hover:block absolute right-0 top-10 w-44 z-40 animate-in fade-in duration-150">
              <div
                className="p-2 rounded-2xl shadow-2xl border border-black/10 dark:border-white/20 bg-white dark:bg-[#141416] space-y-1 text-xs"
              >
                <span className="text-[10px] uppercase font-semibold text-neutral-400 px-2 block">
                  Select Duration:
                </span>
                {[25, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => handleStart(mins)}
                    className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-neutral-800 dark:text-neutral-200"
                  >
                    <span>{mins} Minutes</span>
                    <Play className="w-3 h-3 fill-current opacity-70" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <GlassCard
            variant="pill"
            className="px-3 py-1.5 flex items-center gap-2.5 shadow-xl border border-black/15 dark:border-white/20 text-xs font-mono"
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span className="font-semibold text-neutral-900 dark:text-white">
              {formatTime(elapsedSeconds)}
            </span>
            <span className="text-neutral-400">/ {targetMinutes}m</span>

            <button
              onClick={() => setIsPaused(!isPaused)}
              className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full"
              title={isPaused ? 'Resume' : 'Pause'}
            >
              {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            </button>

            <button
              onClick={handleEnd}
              className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full text-red-500"
              title="Finish Session"
            >
              <Square className="w-3 h-3 fill-current" />
            </button>
          </GlassCard>
        )}
      </div>

      {/* End of Session Summary Modal */}
      {showSummary && completedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md">
          <GlassCard
            variant="surface"
            className="w-full max-w-md p-6 shadow-2xl border border-black/10 dark:border-white/20 bg-white/95 dark:bg-neutral-900/95 space-y-6 text-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center mx-auto shadow-md">
              <Award className="w-6 h-6" />
            </div>

            <div>
              <span className="text-xs uppercase font-mono tracking-widest text-neutral-400 block mb-1">
                Session Complete
              </span>
              <h3 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                {completedSession.durationMinutes} Minutes of Focus
              </h3>
              <p className="text-xs text-neutral-500 mt-1">{documentTitle}</p>
            </div>

            <div className="grid grid-cols-3 gap-2 py-3 border-y border-black/5 dark:border-white/10 text-center">
              <div>
                <span className="text-lg font-bold font-mono text-neutral-900 dark:text-white block">
                  {completedSession.pagesRead}
                </span>
                <span className="text-[10px] text-neutral-400 uppercase">Pages Read</span>
              </div>
              <div>
                <span className="text-lg font-bold font-mono text-neutral-900 dark:text-white block">
                  {completedSession.questionsDone}
                </span>
                <span className="text-[10px] text-neutral-400 uppercase">Questions</span>
              </div>
              <div>
                <span className="text-lg font-bold font-mono text-neutral-900 dark:text-white block">
                  {completedSession.flashcardsDone}
                </span>
                <span className="text-[10px] text-neutral-400 uppercase">Flashcards</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-left text-xs space-y-1">
              <span className="font-semibold text-neutral-900 dark:text-white block text-[11px]">
                Recommendation for Next Session:
              </span>
              <p className="text-neutral-500">
                Continue reading <strong>{documentTitle}</strong> from <strong>Page {currentPage}</strong> to maintain deep concept comprehension.
              </p>
            </div>

            <GlassButton
              variant="primary"
              className="w-full justify-center py-2.5"
              onClick={() => setShowSummary(false)}
            >
              Done
            </GlassButton>
          </GlassCard>
        </div>
      )}
    </>
  );
};
