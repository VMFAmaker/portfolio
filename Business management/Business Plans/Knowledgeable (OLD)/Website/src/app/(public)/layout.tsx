import type { ReactNode } from 'react';
import { AppLogo } from '@/components/AppLogo';
import { LanguageSelect } from '@/components/LanguageSelect';
import { PublicFooter } from '@/components/PublicFooter';
import { BackLink } from '@/components/BackLink';

/** Help Centre and policies — readable whether or not you're signed in. */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b p-4 sm:px-6">
        <AppLogo />
        <LanguageSelect compact />
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <BackLink />
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
