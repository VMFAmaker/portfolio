/**
 * Splits long texts into reader-sized sections (chapters, or evenly sized parts), used by the
 * Gutenberg seed and by server-side imports of papers, articles, scans and EPUBs.
 */

export interface Section {
  title: string;
  body: string;
  wordCount: number;
}

const MIN_SECTION_WORDS = 400;
const TARGET_SECTION_WORDS = 3500;
const MAX_SECTION_WORDS = 7000;
const FOLD_BELOW_WORDS = 80;

/** Joins hard-wrapped lines into paragraphs; blank lines separate paragraphs. */
export function toParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.split('\n').map((l) => l.trim()).join(' ').replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 0 && !/^[*\s.]+$/.test(p));
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

const MINOR_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);

function isTitleLike(text: string): boolean {
  if (/[:;,]$/.test(text)) return false;
  return text.split(/\s+/).every((w, i) => /^[^a-z]/.test(w) || (i > 0 && MINOR_WORDS.has(w)));
}

export function isHeading(paragraph: string): boolean {
  if (paragraph.length > 70) return false;
  if (/^(chapter|book|part|section|letter|lecture|preface|introduction|conclusion)\b/i.test(paragraph)) return true;
  // A bare numeral: "IV" or "IV." (a sentence that merely starts with the word "I" doesn't count).
  if (/^[IVXLC]+\.?$/.test(paragraph)) return true;
  // "IV. The Title" counts only when what follows reads like a title, not a sentence.
  const numbered = paragraph.match(/^[IVXLC]+\.\s+(.+)$/);
  if (numbered) return isTitleLike(numbered[1]);
  const letters = paragraph.replace(/[^A-Za-z]/g, '');
  return letters.length >= 4 && letters === letters.toUpperCase() && paragraph.split(' ').length <= 8;
}

function titleCase(heading: string): string {
  if (heading !== heading.toUpperCase()) return heading;
  return heading.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\b(Iv|Ix|Vi{0,3}|Xi{0,3}|Xv|Xx|Li|Ci|Ii|Iii)\b/g, (m) => m.toUpperCase());
}

function chunkParagraphs(paragraphs: string[], target: number): string[][] {
  const chunks: string[][] = [];
  let current: string[] = [];
  let words = 0;
  for (const p of paragraphs) {
    current.push(p);
    words += countWords(p);
    if (words >= target) {
      chunks.push(current);
      current = [];
      words = 0;
    }
  }
  if (current.length) {
    if (chunks.length && words < MIN_SECTION_WORDS) chunks[chunks.length - 1].push(...current);
    else chunks.push(current);
  }
  return chunks;
}

/**
 * Splits at chapter-like headings when the book has them, merging tiny fragments (e.g. a table
 * of contents) and breaking up very long chapters; otherwise falls back to evenly sized parts.
 */
export function splitIntoSections(text: string): Section[] {
  const paragraphs = toParagraphs(text);
  const headingIdx = paragraphs.map((p, i) => (isHeading(p) ? i : -1)).filter((i) => i >= 0);

  let groups: Array<{ heading?: string; paragraphs: string[] }> = [];
  if (headingIdx.length >= 3) {
    let current: { heading?: string; paragraphs: string[] } = { paragraphs: [] };
    for (const p of paragraphs) {
      if (isHeading(p)) {
        if (current.paragraphs.length || current.heading) groups.push(current);
        current = { heading: p, paragraphs: [] };
      } else {
        current.paragraphs.push(p);
      }
    }
    groups.push(current);
    // Fragments too short to be a real section (a table of contents, a title page, a two-line
    // epigraph) are folded into the start of the next real section.
    const merged: typeof groups = [];
    let pending: string[] = [];
    for (const g of groups) {
      if (countWords(g.paragraphs.join(' ')) < MIN_SECTION_WORDS) {
        pending.push(...(g.heading ? [g.heading] : []), ...g.paragraphs);
        continue;
      }
      merged.push({ heading: g.heading, paragraphs: [...pending, ...g.paragraphs] });
      pending = [];
    }
    if (pending.length) {
      if (merged.length) merged[merged.length - 1].paragraphs.push(...pending);
      else merged.push({ paragraphs: pending });
    }
    groups = merged;
  } else {
    groups = chunkParagraphs(paragraphs, TARGET_SECTION_WORDS).map((chunk) => ({ paragraphs: chunk }));
  }

  return normaliseSections(groups);
}

/**
 * For sources that already have structure (paper sections, article headings, EPUB chapters):
 * folds fragments too short to stand alone into the next section and splits very long ones.
 */
export function normaliseSections(groups: Array<{ heading?: string; paragraphs: string[] }>, foldShort = false): Section[] {
  if (foldShort) {
    // A section this short ("Funding", "Conflicts of interest") reads better as part of the next.
    const merged: typeof groups = [];
    let carry: string[] = [];
    for (const g of groups) {
      if (countWords(g.paragraphs.join(' ')) < FOLD_BELOW_WORDS) {
        carry.push(...(g.heading ? [g.heading] : []), ...g.paragraphs);
        continue;
      }
      merged.push({ heading: g.heading, paragraphs: [...carry, ...g.paragraphs] });
      carry = [];
    }
    if (carry.length) {
      if (merged.length) merged[merged.length - 1].paragraphs.push(...carry);
      else merged.push({ paragraphs: carry });
    }
    groups = merged;
  }
  const sections: Section[] = [];
  for (const group of groups) {
    const parts = countWords(group.paragraphs.join(' ')) > MAX_SECTION_WORDS
      ? chunkParagraphs(group.paragraphs, TARGET_SECTION_WORDS)
      : [group.paragraphs];
    parts.forEach((part, i) => {
      const base = group.heading ? titleCase(group.heading) : `Part ${sections.length + 1}`;
      const body = part.join('\n\n');
      sections.push({
        title: parts.length > 1 ? `${base} (${i + 1}/${parts.length})` : base,
        body,
        wordCount: countWords(body),
      });
    });
  }
  return sections.filter((s) => s.wordCount > 0);
}
