import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/providers/AuthProvider';

export const metadata: Metadata = {
  title: 'AuraPDF — Student-First PDF Study Application',
  description:
    'A production-quality PDF study engine designed around how students actually study: grounded AI tutoring, flashcards, MCQs, and monochrome glass UI.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[var(--bg)] text-[var(--fg)] antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
