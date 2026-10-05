import 'server-only';

import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminAuth } from '@/lib/firebase/admin';
import { SESSION_COOKIE } from '@/lib/auth/constants';

export interface SessionUser {
  uid: string;
  email?: string;
  emailVerified: boolean;
  admin: boolean;
}

/**
 * Verifies the session cookie (signature, expiry, and — via checkRevoked — that the user was not
 * disabled/deleted or signed out everywhere). Cached per request so layouts, pages and server
 * actions can all call it cheaply.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const sessionCookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!sessionCookie) return null;
  try {
    const decoded = await adminAuth().verifySessionCookie(sessionCookie, true);
    return {
      uid: decoded.uid,
      email: decoded.email,
      emailVerified: decoded.email_verified === true,
      admin: decoded.admin === true,
    };
  } catch {
    return null;
  }
});

/** For server components: redirect to the login page when there is no valid session. */
export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect('/login?reason=session');
  return user;
}

export class UnauthorizedError extends Error {
  constructor() {
    super('You must be signed in to do that.');
    this.name = 'UnauthorizedError';
  }
}

/** For server actions / route handlers: throw instead of redirecting. */
export async function assertSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new UnauthorizedError();
  return user;
}
