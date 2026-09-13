'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  Clock,
  Star,
  Folder,
  Layers,
  CheckCircle2,
  TrendingUp,
  Map,
  Settings,
  User,
  Sparkles,
  Search,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useSession } from 'next-auth/react';

interface NavigationProps {
  onOpenSettings?: () => void;
  onOpenCommandPalette?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  onOpenSettings,
  onOpenCommandPalette,
}) => {
  const pathname = usePathname();

  const navSections = [
    {
      title: 'LIBRARY',
      items: [
        { label: 'Recent', href: '/', icon: Clock },
        { label: 'All PDFs', href: '/?view=all', icon: BookOpen },
        { label: 'Favorites', href: '/?view=favorites', icon: Star },
        { label: 'Folders', href: '/?view=folders', icon: Folder },
      ],
    },
    {
      title: 'STUDY',
      items: [
        { label: 'Flashcards', href: '/study/flashcards', icon: Layers },
        { label: 'Practice (MCQs)', href: '/study/practice', icon: CheckCircle2 },
        { label: 'Progress & Weak Topics', href: '/study/progress', icon: TrendingUp },
        { label: 'Study Map', href: '/study/map', icon: Map },
      ],
    },
  ];

  const { data: session } = useSession();

  return (
    <>
      {/* Desktop / iPad Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-screen border-r border-black/5 dark:border-white/10 bg-[#F7F7F5]/80 dark:bg-[#0B0B0B]/80 backdrop-blur-xl p-5 select-none shrink-0">
        {/* Brand */}
        <div className="flex items-center justify-between pb-6 pt-1">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-black dark:bg-white flex items-center justify-center text-white dark:text-black font-semibold text-sm shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold tracking-tight text-neutral-900 dark:text-white text-base">
                AuraPDF
              </span>
              <span className="text-[10px] block text-neutral-400 -mt-1 font-mono uppercase tracking-wider">
                Study Engine
              </span>
            </div>
          </Link>
        </div>

        {/* Quick Search / Cmd+K button */}
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center justify-between w-full px-3 py-2 text-xs text-neutral-500 dark:text-neutral-400 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl mb-6 transition-colors border border-black/5 dark:border-white/5"
        >
          <span className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5" />
            <span>Search & actions...</span>
          </span>
          <kbd className="px-1.5 py-0.5 text-[10px] bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded shadow-xs font-mono">
            ⌘K
          </kbd>
        </button>

        {/* Navigation Sections */}
        <div className="flex-1 space-y-6 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <p className="px-3 text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 tracking-wider">
                {section.title}
              </p>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={clsx(
                      'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-black/10 dark:bg-white/15 text-neutral-900 dark:text-white font-semibold'
                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-neutral-900 dark:hover:text-white'
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* System / Bottom Actions */}
        <div className="pt-4 border-t border-black/5 dark:border-white/10 space-y-2">
          <p className="px-3 text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 tracking-wider">
            SYSTEM
          </p>
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>

          {/* User Profile & Study Mode */}
          <div className="p-2.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-neutral-900 dark:bg-white flex items-center justify-center text-xs font-semibold text-white dark:text-neutral-900 shrink-0 shadow-xs">
                A
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-neutral-900 dark:text-white truncate">
                  {session?.user?.name || 'Alex Vance'}
                </p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium truncate flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                  Shared Cloud Library
                </p>
              </div>
            </div>

            <button
              onClick={onOpenSettings}
              title="Study Settings"
              className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors shrink-0 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-pill border-t border-black/10 dark:border-white/10 px-3 py-2 flex items-center justify-around">
        <Link
          href="/"
          className={clsx(
            'flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-2',
            pathname === '/' ? 'text-black dark:text-white' : 'text-neutral-400'
          )}
        >
          <BookOpen className="w-5 h-5" />
          <span>Library</span>
        </Link>
        <Link
          href="/study/flashcards"
          className={clsx(
            'flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-2',
            pathname.startsWith('/study/flashcards') ? 'text-black dark:text-white' : 'text-neutral-400'
          )}
        >
          <Layers className="w-5 h-5" />
          <span>Cards</span>
        </Link>
        <Link
          href="/study/practice"
          className={clsx(
            'flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-2',
            pathname.startsWith('/study/practice') ? 'text-black dark:text-white' : 'text-neutral-400'
          )}
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>Quiz</span>
        </Link>
        <Link
          href="/study/progress"
          className={clsx(
            'flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-2',
            pathname.startsWith('/study/progress') ? 'text-black dark:text-white' : 'text-neutral-400'
          )}
        >
          <TrendingUp className="w-5 h-5" />
          <span>Progress</span>
        </Link>
        <button
          onClick={onOpenSettings}
          className="flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-2 text-neutral-400"
        >
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </button>
      </nav>
    </>
  );
};
