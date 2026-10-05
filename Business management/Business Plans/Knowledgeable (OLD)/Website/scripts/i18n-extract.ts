/**
 * Lists every string passed to t('…') / msg('…') in src/ that is missing from the Spanish or
 * French dictionaries.  Run with:  npx tsx scripts/i18n-extract.ts
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { es } from '../src/lib/i18n/messages/es';
import { fr } from '../src/lib/i18n/messages/fr';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(tsx?|ts)$/.test(name) && !name.endsWith('.test.ts') ? [full] : [];
  });
}

const found = new Set<string>();
const pattern = /\b(?:t|msg)\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/g;
for (const file of sourceFiles(path.resolve('src'))) {
  for (const match of readFileSync(file, 'utf8').matchAll(pattern)) {
    if (match[1] === '`' && match[2].includes('${')) continue;
    found.add(match[2].replace(/\\'/g, "'").replace(/\\"/g, '"'));
  }
}

const missing = [...found].filter((s) => !(s in es) || !(s in fr)).sort();
console.log(JSON.stringify(missing, null, 1));
console.error(`${found.size} strings, ${missing.length} missing a translation`);
