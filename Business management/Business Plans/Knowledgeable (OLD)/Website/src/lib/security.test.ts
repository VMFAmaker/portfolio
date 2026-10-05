import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isPublicPath, safeNextPath } from '@/lib/auth/constants';
import { safeExternalUrl } from '@/lib/safe-url';
import { ALL_TOPIC_IDS } from '@/lib/taxonomy';

describe('safeNextPath (open-redirect protection)', () => {
  it('allows same-site paths', () => {
    expect(safeNextPath('/profile/abc?tab=read')).toBe('/profile/abc?tab=read');
  });
  it.each(['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', '', null])(
    'rejects %s',
    (value) => {
      expect(safeNextPath(value as string | null)).toBe('/');
    }
  );
  it('does not bounce back to auth pages', () => {
    expect(safeNextPath('/login')).toBe('/');
  });
});

describe('isPublicPath', () => {
  it('only exposes the auth pages', () => {
    expect(isPublicPath('/login')).toBe(true);
    expect(isPublicPath('/forgot-password')).toBe(true);
    expect(isPublicPath('/loginx')).toBe(false);
    expect(isPublicPath('/settings')).toBe(false);
    expect(isPublicPath('/')).toBe(false);
  });
});

describe('safeExternalUrl (XSS protection for untrusted links)', () => {
  it('keeps http(s) links', () => {
    expect(safeExternalUrl('https://www.nasa.gov/exoplanets')).toBe('https://www.nasa.gov/exoplanets');
  });
  it.each(['javascript:alert(document.cookie)', 'JaVaScRiPt:alert(1)', 'data:text/html,<script>alert(1)</script>', '/relative', 'not a url', undefined])(
    'drops %s',
    (value) => {
      expect(safeExternalUrl(value)).toBeNull();
    }
  );
});

describe('firestore.rules topic list', () => {
  it('matches src/lib/taxonomy.ts exactly', () => {
    const rules = readFileSync('firestore.rules', 'utf8');
    const block = rules.slice(rules.indexOf('function topicIds()'), rules.indexOf('function isTopicList'));
    const ids = Array.from(block.matchAll(/'([a-z0-9-]+)'/g)).map((m) => m[1]);
    expect(ids.sort()).toEqual([...ALL_TOPIC_IDS].sort());
  });
});
