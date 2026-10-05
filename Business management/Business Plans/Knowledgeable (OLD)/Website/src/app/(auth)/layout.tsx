import type { ReactNode } from 'react';
import { AppLogo } from '@/components/AppLogo';
import { LanguageSelect } from '@/components/LanguageSelect';
import { PublicFooter } from '@/components/PublicFooter';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="flex items-center justify-between p-4 sm:p-6">
        <AppLogo />
        <LanguageSelect compact />
      </header>
      {/* The form is centred in the space left over; the footer follows it, so on tall pages
          (sign-up) it is pushed down instead of covering the form. */}
      <main className="flex flex-1 items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <PublicFooter />
    </div>
  );
}
