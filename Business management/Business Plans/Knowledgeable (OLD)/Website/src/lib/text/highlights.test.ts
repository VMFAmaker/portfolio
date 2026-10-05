import { describe, expect, it } from 'vitest';
import { segmentParagraph } from '@/lib/text/highlights';

const text = 'The quick brown fox jumps over the lazy dog.';

describe('segmentParagraph', () => {
  it('returns the whole paragraph when nothing is highlighted', () => {
    expect(segmentParagraph(text, [])).toEqual([{ text, start: 0 }]);
  });

  it('splits around a highlight and keeps the text intact', () => {
    const segments = segmentParagraph(text, [{ id: 'a', start: 4, end: 9, colour: 'yellow' }]);
    expect(segments.map((s) => s.text).join('')).toBe(text);
    expect(segments[1]).toEqual({ text: 'quick', start: 4, annotationId: 'a', colour: 'yellow' });
  });

  it('handles overlapping and out-of-range highlights', () => {
    const segments = segmentParagraph(text, [
      { id: 'b', start: 10, end: 19, colour: 'blue' },
      { id: 'a', start: 4, end: 15, colour: 'yellow' },
      { id: 'c', start: 40, end: 999, colour: 'pink' },
    ]);
    expect(segments.map((s) => s.text).join('')).toBe(text);
    expect(segments.filter((s) => s.annotationId).map((s) => [s.annotationId, s.text])).toEqual([
      ['a', 'quick brown'],
      ['b', ' fox'],
      ['c', 'dog.'],
    ]);
  });
});
