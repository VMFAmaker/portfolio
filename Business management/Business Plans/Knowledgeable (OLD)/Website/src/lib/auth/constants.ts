/**
 * Named `__session` because Firebase Hosting / App Hosting only forward this cookie name
 * to the server. It is httpOnly, so page scripts (and any injected script) cannot read it.
 */
export const SESSION_COOKIE = '__session';

/** Session lifetime. Firebase allows 5 minutes – 14 days. */
export const SESSION_MAX_AGE_SECONDS = 5 * 24 * 60 * 60;

/** A brand-new session may only be created this soon after the user actually signed in. */
export const RECENT_SIGN_IN_SECONDS = 5 * 60;

/** Routes reachable without a session. Everything else requires one. */
export const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password', '/help', '/legal'];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Only allow redirects to paths on this site. Blocks open-redirects such as
 * `?next=https://evil.example` or `?next=//evil.example`.
 */
export function safeNextPath(next: string | null | undefined, fallback = '/'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  if (isPublicPath(next.split('?')[0])) return fallback;
  return next;
}
