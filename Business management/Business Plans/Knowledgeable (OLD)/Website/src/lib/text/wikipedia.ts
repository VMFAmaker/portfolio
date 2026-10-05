import { parse, type HTMLElement } from 'node-html-parser';

/** Section headings after which a Wikipedia article is only references and links. */
const STOP_HEADINGS = new Set([
  'references', 'notes', 'external links', 'see also', 'further reading', 'bibliography', 'sources', 'citations',
  'referencias', 'notas', 'enlaces externos', 'véase también', 'bibliografía', 'fuentes',
  'références', 'notes et références', 'liens externes', 'voir aussi', 'bibliographie', 'articles connexes',
]);

function clean(text: string): string {
  return text.replace(/\[\d+\]|\[citation needed\]|\[réf\. nécessaire\]|\[cita requerida\]/gi, '').replace(/\s+/g, ' ').trim();
}

/**
 * Turns the HTML of a Wikipedia article (from the MediaWiki parse API) into sections for the
 * reader: the lead becomes "Overview", each level-2 heading starts a section, sub-headings
 * become in-line headings, and tables, infoboxes, images and reference lists are dropped.
 */
export function parseWikipediaHtml(html: string, overviewTitle = 'Overview'): Array<{ heading?: string; paragraphs: string[] }> {
  const root = parse(html);
  for (const el of root.querySelectorAll('sup.reference, .mw-editsection, style, table, figure, .infobox, .navbox, .thumb, .hatnote, .shortdescription, .mw-empty-elt')) {
    el.remove();
  }
  const container = root.querySelector('.mw-parser-output') ?? root;

  const sections: Array<{ heading?: string; paragraphs: string[] }> = [{ heading: overviewTitle, paragraphs: [] }];
  for (const child of container.childNodes) {
    const el = child as HTMLElement;
    const name = el.rawTagName?.toLowerCase();
    if (!name) continue;
    const heading = name === 'div' && el.classList?.contains('mw-heading') ? el.querySelector('h2, h3, h4') : /^h[2-4]$/.test(name) ? el : null;
    if (heading) {
      const text = clean(heading.text);
      if (heading.rawTagName.toLowerCase() === 'h2') {
        if (STOP_HEADINGS.has(text.toLowerCase())) break;
        sections.push({ heading: text, paragraphs: [] });
      } else if (text) {
        sections[sections.length - 1].paragraphs.push(text);
      }
      continue;
    }
    if (name === 'p') {
      const text = clean(el.text);
      if (text) sections[sections.length - 1].paragraphs.push(text);
    } else if (name === 'ul' || name === 'ol') {
      for (const li of el.querySelectorAll('li')) {
        const text = clean(li.text);
        if (text) sections[sections.length - 1].paragraphs.push(`• ${text}`);
      }
    } else if (name === 'blockquote') {
      const text = clean(el.text);
      if (text) sections[sections.length - 1].paragraphs.push(text);
    }
  }
  return sections.filter((s) => s.paragraphs.length > 0);
}
