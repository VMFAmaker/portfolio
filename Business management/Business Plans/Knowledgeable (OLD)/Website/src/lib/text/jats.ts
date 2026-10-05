import { parse, type HTMLElement, type Node } from 'node-html-parser';

/**
 * Reads a scholarly article in JATS XML (the format PubMed Central / Europe PMC publish) into
 * title, authors, abstract and body sections for the in-app reader. Figures and tables are
 * replaced by their captions; references are left out of the reading text.
 */
export interface ParsedPaper {
  title: string;
  authors: string[];
  journal?: string;
  year?: string;
  doi?: string;
  abstract: string[];
  sections: Array<{ heading?: string; paragraphs: string[] }>;
}

function tag(node: Node): string {
  return (node as HTMLElement).rawTagName?.toLowerCase() ?? '';
}

function clean(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function directChild(el: HTMLElement, name: string): HTMLElement | undefined {
  return el.childNodes.find((c) => tag(c) === name) as HTMLElement | undefined;
}

/** Walks a <sec>, turning nested sections into in-line headings. */
function collect(el: HTMLElement, out: string[]): void {
  for (const child of el.childNodes) {
    const name = tag(child);
    const node = child as HTMLElement;
    if (name === 'p') {
      const text = clean(node.text);
      if (text) out.push(text);
    } else if (name === 'sec') {
      const title = directChild(node, 'title');
      if (title && clean(title.text)) out.push(clean(title.text));
      collect(node, out);
    } else if (name === 'list') {
      for (const item of node.querySelectorAll('list-item')) {
        const text = clean(item.text);
        if (text) out.push(`• ${text}`);
      }
    } else if (name === 'fig' || name === 'table-wrap') {
      const caption = node.querySelector('caption');
      const label = clean(directChild(node, 'label')?.text ?? '');
      if (caption && clean(caption.text)) out.push(`[${label ? `${label}: ` : ''}${clean(caption.text)}]`);
    } else if (name === 'disp-quote' || name === 'boxed-text') {
      collect(node, out);
    }
  }
}

export function parseJats(xml: string): ParsedPaper {
  const root = parse(xml, { lowerCaseTagName: false, comment: false });
  const meta = root.querySelector('article-meta');
  const title = clean(meta?.querySelector('article-title')?.text ?? 'Untitled');

  const authors = (meta?.querySelectorAll('contrib') ?? [])
    .filter((c) => (c.getAttribute('contrib-type') ?? 'author') === 'author')
    .map((c) => {
      const given = clean(c.querySelector('given-names')?.text ?? '');
      const surname = clean(c.querySelector('surname')?.text ?? '');
      return clean(`${given} ${surname}`) || clean(c.querySelector('collab')?.text ?? '');
    })
    .filter(Boolean);

  const abstractEl = meta?.querySelector('abstract');
  const abstract: string[] = [];
  if (abstractEl) collect(abstractEl, abstract);
  if (abstractEl && abstract.length === 0 && clean(abstractEl.text)) abstract.push(clean(abstractEl.text));

  const sections: ParsedPaper['sections'] = [];
  const body = root.querySelector('body');
  if (body) {
    let loose: string[] = [];
    for (const child of body.childNodes) {
      if (tag(child) === 'sec') {
        const sec = child as HTMLElement;
        const paragraphs: string[] = [];
        collect(sec, paragraphs);
        if (loose.length) {
          sections.push({ paragraphs: loose });
          loose = [];
        }
        sections.push({ heading: clean(directChild(sec, 'title')?.text ?? '') || undefined, paragraphs });
      } else if (tag(child) === 'p') {
        const text = clean((child as HTMLElement).text);
        if (text) loose.push(text);
      }
    }
    if (loose.length) sections.push({ paragraphs: loose });
  }

  const year = clean(meta?.querySelector('pub-date year')?.text ?? '') || undefined;
  const doi = meta?.querySelectorAll('article-id').find((a) => a.getAttribute('pub-id-type') === 'doi');

  return {
    title,
    authors,
    journal: clean(root.querySelector('journal-title')?.text ?? '') || undefined,
    year,
    doi: doi ? clean(doi.text) : undefined,
    abstract,
    sections: sections.filter((s) => s.paragraphs.length > 0),
  };
}
