import { describe, expect, it } from 'vitest';
import { isHeading, splitIntoSections, stripGutenbergBoilerplate, toParagraphs } from './gutenberg';

const words = (n: number, seed = 'word') => Array.from({ length: n }, (_, i) => `${seed}${i}`).join(' ');

describe('stripGutenbergBoilerplate', () => {
  it('keeps only the text between the START and END markers and drops trademark lines', () => {
    const raw = [
      'The Project Gutenberg eBook of Test',
      'License blah',
      '*** START OF THE PROJECT GUTENBERG EBOOK TEST ***',
      'Real text here.',
      'Produced by volunteers of Project Gutenberg',
      '*** END OF THE PROJECT GUTENBERG EBOOK TEST ***',
      'Footer licence',
    ].join('\r\n');
    expect(stripGutenbergBoilerplate(raw)).toBe('Real text here.');
  });
});

describe('toParagraphs', () => {
  it('unwraps hard-wrapped lines and splits on blank lines', () => {
    expect(toParagraphs('one line\ncontinues here\n\nsecond   para\n\n***')).toEqual(['one line continues here', 'second para']);
  });
});

describe('isHeading', () => {
  it('recognises common chapter headings', () => {
    expect(isHeading('CHAPTER IV')).toBe(true);
    expect(isHeading('BOOK TWO')).toBe(true);
    expect(isHeading('III.')).toBe(true);
    expect(isHeading('This is an ordinary sentence in the text.')).toBe(false);
    expect(isHeading('I am very far from thinking so.')).toBe(false);
    expect(isHeading('I like that better.')).toBe(false);
    expect(isHeading('VI. SPELLING')).toBe(true);
    expect(isHeading('IV. Laws of Variation')).toBe(true);
    expect(isHeading('IV. Point out and correct the faults in the following sentences:')).toBe(false);
  });
});

describe('splitIntoSections', () => {
  it('splits on chapter headings and folds a table of contents into the first chapter', () => {
    const text = [
      'CONTENTS', 'CHAPTER I', 'CHAPTER II', 'CHAPTER III',
      'CHAPTER I', words(600, 'a'),
      'CHAPTER II', words(600, 'b'),
      'CHAPTER III', words(600, 'c'),
    ].join('\n\n');
    const sections = splitIntoSections(text);
    expect(sections.map((s) => s.title)).toEqual(['Chapter I', 'Chapter II', 'Chapter III']);
    expect(sections[0].body.startsWith('CONTENTS')).toBe(true);
    expect(sections[1].body).toContain('b0');
  });

  it('breaks very long chapters into numbered parts', () => {
    const para = words(1000);
    const text = ['CHAPTER I', ...Array(9).fill(para), 'CHAPTER II', words(500), 'CHAPTER III', words(500)].join('\n\n');
    const titles = splitIntoSections(text).map((s) => s.title);
    expect(titles[0]).toMatch(/^Chapter I \(1\/\d\)$/);
    expect(titles).toContain('Chapter II');
  });

  it('falls back to evenly sized parts when there are no headings', () => {
    const text = Array(10).fill(words(1000)).join('\n\n');
    const sections = splitIntoSections(text);
    expect(sections.length).toBeGreaterThan(1);
    expect(sections[0].title).toBe('Part 1');
    expect(sections.every((s) => s.wordCount <= 7000)).toBe(true);
  });
});
