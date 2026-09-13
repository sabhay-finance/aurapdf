import { NextResponse, type NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { nextUrl } = req;

  // If a visitor accesses /login, redirect straight to the library
  if (nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/', nextUrl));
  }

  return NextResponse.next();
}

export default middleware;

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

