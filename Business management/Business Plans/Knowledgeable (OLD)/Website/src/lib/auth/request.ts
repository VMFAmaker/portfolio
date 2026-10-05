import 'server-only';

import type { NextRequest } from 'next/server';

/**
 * CSRF defence for cookie-authenticated endpoints: the request must come from our own origin.
 * Combined with SameSite=Lax cookies and a JSON-only body, a third-party site cannot forge
 * session or account requests.
 */
export function isSameOriginRequest(req: NextRequest): boolean {
  const fetchSite = req.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin') return false;

  const origin = req.headers.get('origin');
  if (!origin) return false;
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function readJsonBody(req: NextRequest): Promise<Record<string, unknown> | null> {
  if (!req.headers.get('content-type')?.includes('application/json')) return null;
  try {
    const body = await req.json();
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
