'use client';

export interface SpeechEngineOptions {
  rate?: number; // 0.75 - 2.0
  pitch?: number;
  lang?: string;
  onBoundary?: (charIndex: number, textLength: number) => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

class SpeechEngine {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private keepAliveInterval: any = null;
  private isCurrentlyPlaying = false;
  private isCurrentlyPaused = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  public isAvailable(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    return this.synth.getVoices();
  }

  public getPreferredVoice(isHindi = false): SpeechSynthesisVoice | null {
    const voices = this.getVoices();
    if (!voices.length) return null;

    if (isHindi) {
      const hindiVoice = voices.find(
        (v) => v.lang.toLowerCase().startsWith('hi') || v.name.toLowerCase().includes('hindi') || v.name.toLowerCase().includes('india')
      );
      if (hindiVoice) return hindiVoice;
    }

    // High quality natural English voices (Google, Samantha, Daniel, Siri, Natural)
    const preferred = voices.find(
      (v) =>
        (v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Enhanced') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel')))
    );

    return preferred || voices.find((v) => v.lang.startsWith('en')) || voices[0] || null;
  }

  public speak(text: string, options: SpeechEngineOptions = {}) {
    if (!this.synth) return;

    this.stop();

    const cleanText = text.replace(/[*#`_~>\[\]]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    this.currentUtterance = utterance;

    const isHindi = Boolean(options.lang?.toLowerCase().startsWith('hi'));
    const voice = this.getPreferredVoice(isHindi);
    if (voice) {
      utterance.voice = voice;
    }

    utterance.rate = options.rate || 1.0;
    utterance.pitch = options.pitch || 1.0;
    if (options.lang) utterance.lang = options.lang;

    utterance.onboundary = (event) => {
      if (options.onBoundary && event.charIndex !== undefined) {
        options.onBoundary(event.charIndex, event.charLength || 0);
      }
    };

    utterance.onstart = () => {
      this.isCurrentlyPlaying = true;
      this.isCurrentlyPaused = false;
      this.startKeepAlive();
    };

    utterance.onend = () => {
      this.isCurrentlyPlaying = false;
      this.isCurrentlyPaused = false;
      this.stopKeepAlive();
      if (options.onEnd) options.onEnd();
    };

    utterance.onerror = (e) => {
      this.isCurrentlyPlaying = false;
      this.isCurrentlyPaused = false;
      this.stopKeepAlive();
      if (options.onError) options.onError(e);
    };

    this.synth.speak(utterance);
  }

  public pause() {
    if (!this.synth || !this.isCurrentlyPlaying) return;
    this.synth.pause();
    this.isCurrentlyPaused = true;
    this.stopKeepAlive();
  }

  public resume() {
    if (!this.synth) return;
    this.synth.resume();
    this.isCurrentlyPaused = false;
    this.startKeepAlive();
  }

  public stop() {
    if (!this.synth) return;
    this.stopKeepAlive();
    this.synth.cancel();
    this.isCurrentlyPlaying = false;
    this.isCurrentlyPaused = false;
    this.currentUtterance = null;
  }

  public isPlaying(): boolean {
    return this.isCurrentlyPlaying && !this.isCurrentlyPaused;
  }

  public isPaused(): boolean {
    return this.isCurrentlyPaused;
  }

  private startKeepAlive() {
    this.stopKeepAlive();
    this.keepAliveInterval = setInterval(() => {
      if (this.synth && this.isCurrentlyPlaying && !this.isCurrentlyPaused) {
        this.synth.pause();
        this.synth.resume();
      }
    }, 10000);
  }

  private stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }
}

export const speechEngine = new SpeechEngine();
