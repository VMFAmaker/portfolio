"use client";

import { useEffect, type ReactNode } from 'react';
import { useI18n } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Keeps the browser's Firebase session and the server's session cookie in agreement.
 * If they diverge (signed out in another tab, different account, cleared storage),
 * everything is signed out rather than guessing which one is right.
 */
export function AuthGate({ serverUid, children }: { serverUid: string; children: ReactNode }) {
  const { status, user, profile, signOut } = useAuth();
  const router = useRouter();
  const { t } = useI18n();
  const mismatched = status === 'unauthenticated' || (user !== null && user.uid !== serverUid);

  useEffect(() => {
    if (mismatched) void signOut();
  }, [mismatched, signOut]);

  useEffect(() => {
    if (user && profile === null) router.replace('/welcome');
  }, [user, profile, router]);

  if (status === 'loading' || mismatched || !user || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" role="status" aria-live="polite">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="sr-only">{t('Loading your account…')}</span>
      </div>
    );
  }
  return <>{children}</>;
}
