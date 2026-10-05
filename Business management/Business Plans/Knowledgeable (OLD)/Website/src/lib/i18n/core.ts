import { es } from '@/lib/i18n/messages/es';
import { fr } from '@/lib/i18n/messages/fr';

/**
 * Translation works like gettext: the British English text IS the key.
 *   t('Log in')                      → "Iniciar sesión" in Spanish
 *   t('{count} votes', { count: 3 }) → "3 votos"
 * Missing translations fall back to English, and `npm test` fails if any t()/msg() string
 * in src/ lacks a Spanish or French entry (see src/lib/i18n/i18n.test.ts).
 */
export type Locale = 'en-GB' | 'es' | 'fr';

export const LOCALES: { value: Locale; label: string }[] = [
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
];

export const DICTIONARIES: Record<Exclude<Locale, 'en-GB'>, Record<string, string>> = { es, fr };

export type Vars = Record<string, string | number>;

export function translate(locale: Locale, text: string, vars?: Vars): string {
  const template = locale === 'en-GB' ? text : DICTIONARIES[locale][text] ?? text;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

/**
 * Marks a string for translation where it is defined (validation messages, error messages)
 * and returns it unchanged; it is translated where it is displayed with t().
 */
export function msg(text: string): string {
  return text;
}

export function isLocale(value: unknown): value is Locale {
  return value === 'en-GB' || value === 'es' || value === 'fr';
}
