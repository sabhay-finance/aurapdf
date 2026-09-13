'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
  FileText,
  Loader2,
  Sparkles,
  Globe,
  FastForward,
} from 'lucide-react';
import { speechEngine } from '@/lib/audio/speechEngine';

interface AudioTutorBarProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle: string;
  currentPage: number;
}

export const AudioTutorBar: React.FC<AudioTutorBarProps> = ({
  isOpen,
  onClose,
  documentId,
  documentTitle,
  currentPage,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [script, setScript] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [language, setLanguage] = useState<'en' | 'hinglish'>('en');
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [showTranscript, setShowTranscript] = useState(false);
  const [charIndex, setCharIndex] = useState(0);

  const rates = [1.0, 1.25, 1.5, 2.0];

  useEffect(() => {
    if (isOpen) {
      loadAudioOverview(language);
    } else {
      speechEngine.stop();
      setIsPlaying(false);
    }
  }, [isOpen, currentPage]);

  const loadAudioOverview = async (lang: 'en' | 'hinglish') => {
    speechEngine.stop();
    setIsPlaying(false);
    setLoading(true);
    setCharIndex(0);

    try {
      const apiKey = typeof window !== 'undefined' ? localStorage.getItem('aura_api_key') || undefined : undefined;
      const provider = typeof window !== 'undefined' ? localStorage.getItem('aura_ai_provider') || undefined : undefined;

      const res = await fetch('/api/ai/audio-overview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: documentId,
          page_number: currentPage,
          language: lang,
          apiKey,
          provider,
        }),
      });

      const data = await res.json();
      if (data.success && data.script) {
        setScript(data.script);
        setTitle(data.title || `Page ${currentPage} Overview`);
        // Start playback automatically
        playSpeech(data.script, lang, playbackRate);
      } else {
        setScript(`Today on Page ${currentPage}, we explore the fundamental mechanisms and concepts of ${documentTitle}. Focus on key formulas and definitions.`);
        setTitle(`Page ${currentPage} Overview`);
      }
    } catch (err) {
      console.error('Failed to load audio overview:', err);
    } finally {
      setLoading(false);
    }
  };

  const playSpeech = (textToSpeak: string, lang: 'en' | 'hinglish', rate: number) => {
    if (!textToSpeak.trim()) return;

    speechEngine.speak(textToSpeak, {
      rate,
      lang: lang === 'hinglish' ? 'hi-IN' : 'en-US',
      onBoundary: (idx) => {
        setCharIndex(idx);
      },
      onEnd: () => {
        setIsPlaying(false);
        setCharIndex(0);
      },
      onError: () => {
        setIsPlaying(false);
      },
    });
    setIsPlaying(true);
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      speechEngine.pause();
      setIsPlaying(false);
    } else {
      if (speechEngine.isPaused()) {
        speechEngine.resume();
        setIsPlaying(true);
      } else {
        playSpeech(script, language, playbackRate);
      }
    }
  };

  const handleChangeLanguage = (newLang: 'en' | 'hinglish') => {
    if (newLang === language) return;
    setLanguage(newLang);
    loadAudioOverview(newLang);
  };

  const handleChangeRate = () => {
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (isPlaying) {
      playSpeech(script, language, nextRate);
    }
  };

  const handleRestart = () => {
    playSpeech(script, language, playbackRate);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Floating Audio Bar Docked at Bottom */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4 pointer-events-auto animate-in slide-in-from-bottom-3 duration-200">
        <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/90 dark:bg-[#121214]/90 backdrop-blur-xl border border-black/15 dark:border-white/15 shadow-2xl text-neutral-900 dark:text-white">
          {/* Play/Pause Button */}
          <button
            onClick={handleTogglePlay}
            disabled={loading}
            className="w-10 h-10 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md shrink-0 cursor-pointer disabled:opacity-50"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
            ) : isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          {/* Info & Title */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <h4 className="text-xs font-semibold truncate text-neutral-900 dark:text-white">
                {title || `Page ${currentPage} Audio Brief`}
              </h4>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
              {loading ? 'Synthesizing voice briefing...' : isPlaying ? 'Playing audio overview' : 'Paused'}
            </p>
          </div>

          {/* Language Switcher */}
          <div className="flex items-center bg-black/5 dark:bg-white/10 rounded-lg p-0.5 text-[11px] font-medium shrink-0">
            <button
              onClick={() => handleChangeLanguage('en')}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                language === 'en'
                  ? 'bg-white dark:bg-[#202024] text-neutral-900 dark:text-white shadow-xs font-semibold'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => handleChangeLanguage('hinglish')}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                language === 'hinglish'
                  ? 'bg-white dark:bg-[#202024] text-neutral-900 dark:text-white shadow-xs font-semibold'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              हिन्दी
            </button>
          </div>

          {/* Playback Speed */}
          <button
            onClick={handleChangeRate}
            className="px-2 py-1 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-[11px] font-mono font-semibold transition-colors cursor-pointer shrink-0"
            title="Cycle Playback Speed"
          >
            {playbackRate}x
          </button>

          {/* Replay */}
          <button
            onClick={handleRestart}
            className="p-2 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title="Replay from start"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Transcript Toggle */}
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className={`p-2 rounded-lg transition-colors cursor-pointer shrink-0 ${
              showTranscript
                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10'
            }`}
            title="Toggle Transcript"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>

          {/* Close */}
          <button
            onClick={() => {
              speechEngine.stop();
              onClose();
            }}
            className="p-2 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title="Close Audio Tutor"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expandable Live Transcript Modal */}
      {showTranscript && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4 pointer-events-auto animate-in fade-in zoom-in-95 duration-200">
          <div className="p-4 rounded-2xl bg-white/95 dark:bg-[#18181C]/95 backdrop-blur-2xl border border-black/15 dark:border-white/15 shadow-2xl text-neutral-900 dark:text-white space-y-3 max-h-72 overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/10">
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Spoken Audio Script</span>
              </div>
              <button
                onClick={() => setShowTranscript(false)}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 text-xs"
              >
                ✕
              </button>
            </div>
            <p className="text-xs leading-relaxed text-neutral-700 dark:text-neutral-200 font-sans">
              {script}
            </p>
          </div>
        </div>
      )}
    </>
  );
};
