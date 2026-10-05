import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { requireSessionUser } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';
import { AppShell } from '@/components/layout/AppShell';

export const dynamic = 'force-dynamic';

/**
 * Every page in the (app) group is private. The session cookie is verified here on the server
 * (signature, expiry, revocation) before any page renders; users who haven't finished
 * onboarding are sent to /welcome.
 */
export default async function AppPagesLayout({ children }: { children: ReactNode }) {
  const session = await requireSessionUser();
  const profile = await adminDb().collection('users').doc(session.uid).get();
  if (!profile.exists) redirect('/welcome');

  return <AppShell serverUid={session.uid}>{children}</AppShell>;
}
