import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { requireSessionUser } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';
import { AppLogo } from '@/components/AppLogo';
import { LanguageSelect } from '@/components/LanguageSelect';

export const dynamic = 'force-dynamic';

export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const session = await requireSessionUser();
  const profile = await adminDb().collection('users').doc(session.uid).get();
  if (profile.exists) redirect('/');

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between p-4 sm:p-6">
        <AppLogo />
        <LanguageSelect compact />
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 pb-16">{children}</main>
    </div>
  );
}
