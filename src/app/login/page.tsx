'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#F7F7F5] dark:bg-[#0A0A0C] text-neutral-900 dark:text-neutral-100">
      <div className="text-center space-y-4 max-w-sm">
        <div className="w-12 h-12 rounded-2xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center mx-auto shadow-lg">
          <Sparkles className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-semibold">Welcome to AuraPDF</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Open study mode is active. Redirecting to your library...
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <span>Open Library</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

