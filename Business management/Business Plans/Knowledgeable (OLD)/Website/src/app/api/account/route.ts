import { NextResponse, type NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { RECENT_SIGN_IN_SECONDS, SESSION_COOKIE } from '@/lib/auth/constants';
import { isSameOriginRequest, readJsonBody } from '@/lib/auth/request';
import { deleteUserAndData } from '@/lib/server/delete-account';

export const dynamic = 'force-dynamic';

/**
 * Permanently delete the signed-in user's account. Requires BOTH a valid session cookie and a
 * freshly re-authenticated ID token for the same user, so a stolen cookie alone can't do it.
 */
export async function DELETE(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const sessionCookie = req.cookies.get(SESSION_COOKIE)?.value;
  const body = await readJsonBody(req);
  const idToken = body?.idToken;
  if (!sessionCookie || typeof idToken !== 'string' || idToken.length > 4096) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  let uid: string;
  try {
    const session = await adminAuth().verifySessionCookie(sessionCookie, true);
    const token = await adminAuth().verifyIdToken(idToken, true);
    if (session.uid !== token.uid) throw new Error('uid mismatch');
    if (Date.now() / 1000 - token.auth_time > RECENT_SIGN_IN_SECONDS) {
      return NextResponse.json({ error: 'recent_sign_in_required' }, { status: 401 });
    }
    uid = token.uid;
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    await deleteUserAndData(uid);
  } catch (error) {
    console.error('Account deletion failed', { uid, error });
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
  return res;
}
