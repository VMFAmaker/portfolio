"use client";

import { Languages } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from '@/contexts/LanguageContext';
import { LOCALES, type Locale } from '@/lib/i18n/core';
import { cn } from '@/lib/utils';

export function LanguageSelect({ id, className, compact = false }: { id?: string; className?: string; compact?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <Select value={locale} onValueChange={(value) => setLocale(value as Locale)}>
      <SelectTrigger id={id} className={cn(compact ? 'h-9 w-auto gap-2' : 'w-full', className)} aria-label={t('Language')}>
        {compact && <Languages className="h-4 w-4" />}
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LOCALES.map((l) => (
          <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
