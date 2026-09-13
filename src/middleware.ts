import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isAuthenticated = !!req.auth?.user;

  const isAuthRoute = nextUrl.pathname.startsWith('/api/auth');
  const isHealthRoute = nextUrl.pathname === '/api/health';
  const isLoginPage = nextUrl.pathname === '/login';
  const isPublicAsset =
    nextUrl.pathname.startsWith('/_next') ||
    nextUrl.pathname.startsWith('/favicon') ||
    nextUrl.pathname.startsWith('/samples') ||
    nextUrl.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js)$/i);

  if (isAuthRoute || isHealthRoute || isPublicAsset) {
    return NextResponse.next();
  }

  if (isLoginPage) {
    if (isAuthenticated) {
      const callbackUrl = nextUrl.searchParams.get('callbackUrl') || '/';
      // Prevent open redirect attack
      const safeCallbackUrl = callbackUrl.startsWith('/') && !callbackUrl.startsWith('//') ? callbackUrl : '/';
      return NextResponse.redirect(new URL(safeCallbackUrl, nextUrl));
    }
    return NextResponse.next();
  }

  // Protected route interception
  if (!isAuthenticated) {
    // For API calls, return structured 401 response
    if (nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Authentication session required.' },
        { status: 401 }
      );
    }

    // For web pages, redirect to /login and preserve intended destination
    const redirectUrl = new URL('/login', nextUrl);
    redirectUrl.searchParams.set('callbackUrl', nextUrl.pathname + nextUrl.search);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
