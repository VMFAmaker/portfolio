"use client";

import Link from 'next/link';
import { CurrentYear } from '@/components/CurrentYear';
import { useI18n } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export function PublicFooter({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <footer className={cn('w-full p-4 text-center text-sm text-muted-foreground', className)}>
      <nav className="mb-1 flex flex-wrap justify-center gap-x-4 gap-y-1">
        <Link href="/help" className="hover:underline">{t('Help Centre')}</Link>
        <Link href="/legal/terms" className="hover:underline">{t('User Agreement')}</Link>
        <Link href="/legal/privacy" className="hover:underline">{t('Privacy Policy')}</Link>
        <Link href="/legal/community" className="hover:underline">{t('Community Guidelines')}</Link>
      </nav>
      © Knowledgeable <CurrentYear />
    </footer>
  );
}
