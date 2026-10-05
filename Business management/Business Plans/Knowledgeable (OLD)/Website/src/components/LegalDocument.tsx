"use client";

import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useI18n } from '@/contexts/LanguageContext';

export interface LegalSection {
  heading: string;
  body: ReactNode;
}

/**
 * Policies are written in English only for now: legal text should be translated by a
 * professional, not machine-translated. They are drafts until reviewed by a lawyer.
 */
export function LegalDocument({ title, updated, intro, sections }: { title: string; updated: string; intro: ReactNode; sections: LegalSection[] }) {
  const { t, locale } = useI18n();
  return (
    <article className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('Last updated')}: {updated}</p>
      </div>
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {t('Draft for review. This document has not yet been checked by a lawyer and may change before launch.')}
          {locale !== 'en-GB' && <> {t('It is currently available in English only.')}</>}
        </AlertDescription>
      </Alert>
      <div className="space-y-3 leading-relaxed" lang="en-GB">{intro}</div>
      {sections.map((section, i) => (
        <section key={section.heading} className="space-y-2" lang="en-GB">
          <h2 className="text-xl font-semibold">{i + 1}. {section.heading}</h2>
          <div className="space-y-2 leading-relaxed text-foreground/90">{section.body}</div>
        </section>
      ))}
    </article>
  );
}
