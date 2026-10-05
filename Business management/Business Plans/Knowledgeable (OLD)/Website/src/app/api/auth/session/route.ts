import { NextResponse, type NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, RECENT_SIGN_IN_SECONDS } from '@/lib/auth/constants';
import { isSameOriginRequest, readJsonBody } from '@/lib/auth/request';

export const dynamic = 'force-dynamic';

function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

/**
 * Exchange a Firebase ID token (from the client SDK, right after sign-in) for an httpOnly
 * session cookie. The server then trusts only this cookie — never client-side state.
 */
export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const body = await readJsonBody(req);
  const idToken = body?.idToken;
  if (typeof idToken !== 'string' || idToken.length === 0 || idToken.length > 4096) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  let decoded;
  try {
    decoded = await adminAuth().verifyIdToken(idToken, true);
  } catch {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
  }

  // A fresh session requires a fresh sign-in, so a stolen/old ID token can't mint a 5-day session.
  // Exception: refreshing an existing valid session for the same user (e.g. after email verification).
  let refreshingOwnSession = false;
  const existing = req.cookies.get(SESSION_COOKIE)?.value;
  if (existing) {
    try {
      const current = await adminAuth().verifySessionCookie(existing, true);
      refreshingOwnSession = current.uid === decoded.uid;
    } catch {
      refreshingOwnSession = false;
    }
  }
  const secondsSinceSignIn = Date.now() / 1000 - decoded.auth_time;
  if (!refreshingOwnSession && secondsSinceSignIn > RECENT_SIGN_IN_SECONDS) {
    return NextResponse.json({ error: 'recent_sign_in_required' }, { status: 401 });
  }

  let sessionCookie: string;
  try {
    sessionCookie = await adminAuth().createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE_SECONDS * 1000,
    });
  } catch {
    return NextResponse.json({ error: 'session_failed' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, sessionCookie, sessionCookieOptions(SESSION_MAX_AGE_SECONDS));
  return res;
}

/** Sign out of this browser. Pass `{ "everywhere": true }` to revoke every device's session. */
export async function DELETE(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const body = await readJsonBody(req);
  const existing = req.cookies.get(SESSION_COOKIE)?.value;

  if (existing && body?.everywhere === true) {
    try {
      const current = await adminAuth().verifySessionCookie(existing, true);
      await adminAuth().revokeRefreshTokens(current.uid);
    } catch {
      // Cookie already invalid — clearing it below is all that's needed.
    }
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', sessionCookieOptions(0));
  return res;
}
