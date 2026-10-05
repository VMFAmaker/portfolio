import { describe, expect, it } from 'vitest';
import { expandInterests, ALL_TOPIC_IDS } from '@/lib/taxonomy';
import { nextReviewDate, REVIEW_INTERVALS_DAYS } from '@/lib/data/spaced-repetition';
import { keywordsFor } from '@/lib/data/posts';

describe('expandInterests (personalized feed)', () => {
  it('a whole subject includes all of its niches', () => {
    const { primary } = expandInterests(['physics']);
    expect(primary).toEqual(expect.arrayContaining(['physics', 'astrophysics', 'cosmology', 'thermodynamics']));
  });

  it('a niche brings its siblings in as occasional "adjacent" topics', () => {
    const { primary, adjacent } = expandInterests(['astrophysics']);
    expect(primary).toEqual(['astrophysics']);
    expect(adjacent).toEqual(expect.arrayContaining(['physics', 'cosmology']));
    expect(adjacent).not.toContain('astrophysics');
  });

  it('never marks something as adjacent when it is already primary', () => {
    const { primary, adjacent } = expandInterests(['physics', 'astrophysics']);
    expect(adjacent.filter((a) => primary.includes(a))).toEqual([]);
  });

  it('ignores unknown ids', () => {
    expect(expandInterests(['nope'])).toEqual({ primary: [], adjacent: [] });
  });

  it('topic ids are unique', () => {
    expect(new Set(ALL_TOPIC_IDS).size).toBe(ALL_TOPIC_IDS.length);
  });
});

describe('spaced repetition schedule', () => {
  const from = new Date('2026-01-01T00:00:00Z');
  const days = (d: Date) => Math.round((d.getTime() - from.getTime()) / 86_400_000);

  it('uses expanding intervals', () => {
    expect(days(nextReviewDate(0, from))).toBe(1);
    expect(days(nextReviewDate(1, from))).toBe(3);
    expect(days(nextReviewDate(3, from))).toBe(16);
  });

  it('clamps out-of-range stages', () => {
    expect(days(nextReviewDate(-5, from))).toBe(1);
    expect(days(nextReviewDate(99, from))).toBe(REVIEW_INTERVALS_DAYS.at(-1));
  });
});

describe('keywordsFor (search index)', () => {
  it('lower-cases, strips accents and stop words, de-duplicates', () => {
    expect(keywordsFor('The Élégant Universe', 'the universe')).toEqual(['elegant', 'universe']);
  });
});
