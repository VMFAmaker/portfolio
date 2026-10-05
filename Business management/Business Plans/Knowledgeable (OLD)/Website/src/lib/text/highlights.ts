export interface Segment {
  text: string;
  start: number;
  /** Set when this piece of text is highlighted. */
  annotationId?: string;
  colour?: string;
}

/**
 * Splits a paragraph into plain and highlighted pieces. Overlapping highlights don't nest: the
 * earlier-starting one wins and the later one shows only for its non-overlapping remainder.
 */
export function segmentParagraph(
  text: string,
  ranges: Array<{ id: string; start: number; end: number; colour: string }>
): Segment[] {
  const sorted = ranges
    .map((r) => ({ ...r, start: Math.max(0, Math.min(r.start, text.length)), end: Math.max(0, Math.min(r.end, text.length)) }))
    .filter((r) => r.end > r.start)
    .sort((a, b) => a.start - b.start || b.end - a.end);

  const segments: Segment[] = [];
  let cursor = 0;
  for (const range of sorted) {
    const start = Math.max(range.start, cursor);
    if (start >= range.end) continue;
    if (start > cursor) segments.push({ text: text.slice(cursor, start), start: cursor });
    segments.push({ text: text.slice(start, range.end), start, annotationId: range.id, colour: range.colour });
    cursor = range.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), start: cursor });
  return segments;
}
