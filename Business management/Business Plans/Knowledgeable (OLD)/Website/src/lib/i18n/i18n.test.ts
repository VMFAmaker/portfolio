import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { es } from '@/lib/i18n/messages/es';
import { fr } from '@/lib/i18n/messages/fr';
import { translate } from '@/lib/i18n/core';
import { TOPIC_TRANSLATIONS } from '@/lib/i18n/topics';
import { ALL_TOPIC_IDS } from '@/lib/taxonomy';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(tsx?|ts)$/.test(name) && !name.endsWith('.test.ts') ? [full] : [];
  });
}

/** Every literal passed to t('…') or msg('…') anywhere in src/. */
function translatableStrings(): Set<string> {
  const found = new Set<string>();
  const pattern = /\b(?:t|msg)\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/g;
  for (const file of sourceFiles(path.resolve('src'))) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(pattern)) {
      if (match[1] === '`' && match[2].includes('${')) continue;
      found.add(match[2].replace(/\\'/g, "'").replace(/\\"/g, '"'));
    }
  }
  return found;
}

describe('translations', () => {
  const strings = translatableStrings();

  it('finds the app’s text', () => {
    expect(strings.size).toBeGreaterThan(100);
  });

  it.each([['es', es], ['fr', fr]] as const)('%s has every string', (_locale, dictionary) => {
    const missing = [...strings].filter((s) => !(s in dictionary));
    expect(missing).toEqual([]);
  });

  it.each([['es', es], ['fr', fr]] as const)('%s keeps every {placeholder}', (_locale, dictionary) => {
    const broken = Object.entries(dictionary).filter(([source, target]) => {
      const names = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort().join();
      return names(source) !== names(target);
    });
    expect(broken).toEqual([]);
  });

  it('fills in placeholders and falls back to English', () => {
    expect(translate('en-GB', '{count} votes', { count: 3 })).toBe('3 votes');
    expect(translate('es', 'A string nobody translated')).toBe('A string nobody translated');
  });

  it('translates every topic', () => {
    expect(ALL_TOPIC_IDS.filter((id) => !TOPIC_TRANSLATIONS[id])).toEqual([]);
  });
});
