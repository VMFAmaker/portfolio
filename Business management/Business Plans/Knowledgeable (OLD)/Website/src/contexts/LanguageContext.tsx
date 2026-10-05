"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { format, formatDistanceToNow, type Locale as DateLocale } from 'date-fns';
import { enGB, es as esDate, fr as frDate } from 'date-fns/locale';
import { isLocale, translate, type Locale, type Vars } from '@/lib/i18n/core';
import { topicName } from '@/lib/i18n/topics';

const STORAGE_KEY = 'locale';
const DATE_LOCALES: Record<Locale, DateLocale> = { 'en-GB': enGB, es: esDate, fr: frDate };

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (text: string, vars?: Vars) => string;
  /** Translated subject / niche-topic name. */
  topic: (id: string) => string;
  /** "3 hours ago" in the current language. */
  relative: (iso: string) => string;
  /** "26 September 2026" in the current language. */
  longDate: (iso: string) => string;
  /** "September 2026" in the current language. */
  monthYear: (iso: string) => string;
  time: (iso: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function initialLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    // Storage blocked — fall through to the browser language.
  }
  const browser = typeof navigator !== 'undefined' ? navigator.language.slice(0, 2) : 'en';
  return browser === 'es' ? 'es' : browser === 'fr' ? 'fr' : 'en-GB';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en-GB');

  useEffect(() => setLocaleState(initialLocale()), []);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode — the choice lasts for this visit only.
    }
  }, []);

  const value = useMemo<LanguageContextValue>(() => {
    const dateLocale = DATE_LOCALES[locale];
    return {
      locale,
      setLocale,
      t: (text, vars) => translate(locale, text, vars),
      topic: (id) => topicName(id, locale),
      relative: (iso) => formatDistanceToNow(new Date(iso), { addSuffix: true, locale: dateLocale }),
      longDate: (iso) => format(new Date(iso), 'd MMMM yyyy', { locale: dateLocale }),
      monthYear: (iso) => format(new Date(iso), 'MMMM yyyy', { locale: dateLocale }),
      time: (iso) => format(new Date(iso), 'HH:mm', { locale: dateLocale }),
    };
  }, [locale, setLocale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useI18n must be used within a LanguageProvider');
  return context;
}
