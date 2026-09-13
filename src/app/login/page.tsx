'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Sparkles, Shield, ArrowRight, BookOpen, Layers, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const errorParam = searchParams.get('error');

  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [devEmail, setDevEmail] = useState('student@aurapdf.dev');
  const [devName, setDevName] = useState('Alex Vance');
  const [isDevLoading, setIsDevLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(() => {
    if (!errorParam) return null;
    if (errorParam === 'OAuthSignin' || errorParam === 'OAuthCallback') {
      return 'Google sign-in could not be completed. Please ensure your Google credentials are configured or try again.';
    }
    if (errorParam === 'AccessDenied') {
      return 'Access was denied. Please choose an authorized Google account.';
    }
    if (errorParam === 'Configuration') {
      return 'Authentication service configuration error. Please check server environment settings.';
    }
    return 'An authentication error occurred. Please try again.';
  });

  const isDevAuthEnabled = process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true';

  const [showGoogleSetupGuide, setShowGoogleSetupGuide] = useState(false);
  const isConfigurationError = errorParam === 'Configuration';

  const handleGoogleSignIn = async () => {
    try {
      setIsLoadingGoogle(true);
      setErrorMessage(null);
      await signIn('google', { callbackUrl });
    } catch (err: any) {
      setErrorMessage('Failed to initiate Google sign-in. Please try again.');
      setIsLoadingGoogle(false);
    }
  };

  const handleDevSignIn = async (email: string, name: string) => {
    try {
      setIsDevLoading(true);
      setErrorMessage(null);
      const res = await signIn('dev-login', {
        email,
        name,
        callbackUrl,
        redirect: false,
      });

      if (res?.error) {
        setErrorMessage(res.error);
        setIsDevLoading(false);
      } else if (res?.url) {
        window.location.href = res.url;
      } else {
        window.location.href = callbackUrl;
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Developer sign-in failed');
      setIsDevLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden bg-[#F7F7F5] dark:bg-[#0A0A0C] text-neutral-900 dark:text-neutral-100 selection:bg-neutral-900 selection:text-white dark:selection:bg-white dark:selection:text-black">
      {/* Subtle atmospheric ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-neutral-200/50 to-neutral-400/20 dark:from-white/[0.04] dark:to-white/[0.01] rounded-full blur-3xl pointer-events-none" />

      {/* Main Glass Card */}
      <div className="relative w-full max-w-md p-8 sm:p-10 rounded-3xl bg-white/80 dark:bg-[#141418]/85 backdrop-blur-2xl border border-black/10 dark:border-white/10 shadow-2xl transition-all duration-300">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center shadow-lg mb-4">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono tracking-wider uppercase bg-black/5 dark:bg-white/10 text-neutral-600 dark:text-neutral-300 mb-2">
            AuraPDF Study Engine
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
            Study smarter.
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-xs">
            Your PDFs, finally made for studying. Grounded AI tutoring, active recall, and zero distractions.
          </p>
        </div>

        {/* Configuration Error Notice (when Google OAuth credentials are not entered in .env yet) */}
        {isConfigurationError && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 text-xs space-y-2.5">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900 dark:text-amber-100">
                  Google OAuth Credentials Required
                </p>
                <p className="text-amber-700 dark:text-amber-300 mt-0.5 leading-relaxed">
                  Google sign-in requires <code className="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono">AUTH_GOOGLE_ID</code> and <code className="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono">AUTH_GOOGLE_SECRET</code> in your <code className="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono">.env</code> file.
                </p>
              </div>
            </div>

            {isDevAuthEnabled && (
              <div className="pt-2 border-t border-amber-500/20 flex flex-col gap-2">
                <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                  👉 Log in instantly right now with local test persona:
                </p>
                <button
                  type="button"
                  onClick={() => handleDevSignIn('student@aurapdf.dev', 'Alex Vance')}
                  disabled={isDevLoading}
                  className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isDevLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                  <span>Sign In as Alex Vance (User A)</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGoogleSetupGuide(!showGoogleSetupGuide)}
              className="text-[11px] text-amber-700 dark:text-amber-300 underline hover:text-amber-900 dark:hover:text-amber-100 cursor-pointer text-left block"
            >
              {showGoogleSetupGuide ? 'Hide Google Cloud setup instructions' : 'How to set up Google OAuth credentials →'}
            </button>

            {showGoogleSetupGuide && (
              <div className="mt-2 p-2.5 rounded-xl bg-black/10 dark:bg-black/30 text-[11px] space-y-1.5 font-sans border border-black/10 dark:border-white/10">
                <p className="font-semibold text-neutral-900 dark:text-white">Quick Google Cloud Setup:</p>
                <ol className="list-decimal list-inside space-y-1 text-neutral-700 dark:text-neutral-300">
                  <li>Go to <span className="font-mono">console.cloud.google.com</span> & create an OAuth 2.0 Client ID.</li>
                  <li>Set Authorized Redirect URI to: <code className="block mt-0.5 p-1 rounded bg-black/20 dark:bg-white/10 font-mono text-[10px] break-all select-all">{`${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/auth/callback/google`}</code></li>
                  <li>Paste the Client ID & Secret into your <code className="font-mono">.env</code> file:</li>
                  <pre className="p-1.5 rounded bg-black/30 dark:bg-black/60 font-mono text-[10px] text-neutral-200 overflow-x-auto">
                    {`AUTH_GOOGLE_ID="your-client-id.apps.googleusercontent.com"\nAUTH_GOOGLE_SECRET="your-client-secret"`}
                  </pre>
                </ol>
              </div>
            )}
          </div>
        )}

        {/* Other Error Alerts */}
        {errorMessage && !isConfigurationError && (
          <div className="mb-6 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Primary Action: Continue with Google */}
        <div className="space-y-3">
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoadingGoogle || isDevLoading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl font-medium text-sm transition-all duration-200 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900 shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoadingGoogle ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>{isLoadingGoogle ? 'Connecting to Google...' : 'Continue with Google'}</span>
          </button>
        </div>

        {/* Feature Highlights */}
        <div className="mt-8 pt-6 border-t border-black/5 dark:border-white/5 grid grid-cols-3 gap-2 text-center">
          <div className="flex flex-col items-center">
            <BookOpen className="w-4 h-4 text-neutral-400 mb-1" />
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">Smart Reader</span>
          </div>
          <div className="flex flex-col items-center">
            <Sparkles className="w-4 h-4 text-neutral-400 mb-1" />
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">AI Tutoring</span>
          </div>
          <div className="flex flex-col items-center">
            <Layers className="w-4 h-4 text-neutral-400 mb-1" />
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">Flashcards</span>
          </div>
        </div>

        {/* Dev Quick-Login Sandbox (Active only when ENABLE_DEV_AUTH === 'true' in development) */}
        {isDevAuthEnabled && (
          <div className="mt-8 pt-6 border-t border-dashed border-black/10 dark:border-white/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400 font-medium">
                Development Quick Login
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono">
                LOCAL DEV
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => handleDevSignIn('student@aurapdf.dev', 'Alex Vance')}
                disabled={isDevLoading || isLoadingGoogle}
                className="text-left p-2.5 rounded-xl border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                <div className="text-xs font-medium text-neutral-800 dark:text-neutral-200">User A (Alex)</div>
                <div className="text-[10px] text-neutral-400 truncate">student@aurapdf.dev</div>
              </button>

              <button
                type="button"
                onClick={() => handleDevSignIn('researcher@aurapdf.dev', 'Jordan Lee')}
                disabled={isDevLoading || isLoadingGoogle}
                className="text-left p-2.5 rounded-xl border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                <div className="text-xs font-medium text-neutral-800 dark:text-neutral-200">User B (Jordan)</div>
                <div className="text-[10px] text-neutral-400 truncate">researcher@aurapdf.dev</div>
              </button>
            </div>
          </div>
        )}

        {/* Security & Privacy Notice */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-neutral-400 dark:text-neutral-500">
          <Shield className="w-3.5 h-3.5" />
          <span>Zero-trust isolated storage. Encrypted user sessions.</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-[#F7F7F5] dark:bg-[#0A0A0C]">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
