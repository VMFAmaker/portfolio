import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, isPublicPath } from '@/lib/auth/constants';

/**
 * Fast, optimistic gate: no session cookie → go to /login. The cookie is *cryptographically*
 * verified in the (app) layout and in every server action/route; this only saves a round trip.
 */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (isPublicPath(pathname) || req.cookies.has(SESSION_COOKIE)) {
    return NextResponse.next();
  }
  const loginUrl = new URL('/login', req.url);
  if (pathname !== '/') loginUrl.searchParams.set('next', `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Skip API routes (they authenticate themselves), Next internals and static files.
  matcher: ['/((?!api/|_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)'],
};
