export interface TextSelection {
  paragraphIndex: number;
  start: number;
  end: number;
  quote: string;
  rect: DOMRect;
}

function paragraphOf(node: Node | null): HTMLElement | null {
  const el = node instanceof HTMLElement ? node : node?.parentElement ?? null;
  return el?.closest<HTMLElement>('[data-paragraph]') ?? null;
}

function offsetWithin(paragraph: HTMLElement, container: Node, offset: number): number {
  const range = document.createRange();
  range.selectNodeContents(paragraph);
  range.setEnd(container, offset);
  return range.toString().length;
}

/**
 * Reads the current text selection as paragraph-relative character offsets. Selections that run
 * across paragraphs are clipped to the first paragraph, which keeps highlights simple and stable.
 */
export function readSelection(article: HTMLElement | null): TextSelection | null {
  const selection = window.getSelection();
  if (!article || !selection || selection.isCollapsed || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  const paragraph = paragraphOf(range.startContainer);
  if (!paragraph || !article.contains(paragraph)) return null;

  const text = paragraph.textContent ?? '';
  let start = offsetWithin(paragraph, range.startContainer, range.startOffset);
  let end = paragraphOf(range.endContainer) === paragraph ? offsetWithin(paragraph, range.endContainer, range.endOffset) : text.length;
  while (start < end && /\s/.test(text[start])) start++;
  while (end > start && /\s/.test(text[end - 1])) end--;
  if (end - start < 2) return null;

  return {
    paragraphIndex: Number(paragraph.dataset.paragraph),
    start,
    end,
    quote: text.slice(start, end),
    rect: range.getBoundingClientRect(),
  };
}
