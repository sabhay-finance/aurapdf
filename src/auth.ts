import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';

export const DEFAULT_USER = {
  id: 'demo-user-id',
  email: 'student@aura.study',
  name: 'Alex Vance',
  image: null,
};

export const DEFAULT_SESSION = {
  user: DEFAULT_USER,
  expires: '2099-01-01T00:00:00.000Z',
};

const nextAuth = NextAuth({
  ...authConfig,
  providers: [],
});

export const { handlers, signIn, signOut } = nextAuth;

/**
 * Universal auth helper.
 * In open-access mode, returns the active user session or seamlessly falls back
 * to the default student persona so no login is required and all features work out-of-the-box.
 */
export const auth = async (...args: any[]) => {
  try {
    const session = await (nextAuth.auth as any)(...args);
    if (session?.user?.id) {
      return session;
    }
  } catch {
    // Graceful fallback for non-request contexts, build time, or unauthenticated requests
  }
  return DEFAULT_SESSION;
};

