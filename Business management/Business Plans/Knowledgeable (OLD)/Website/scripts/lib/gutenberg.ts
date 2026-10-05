/**
 * Turns a Project Gutenberg plain-text file into reader-sized sections.
 *
 * Licensing: the works we import are public domain. Gutenberg's licence asks that, when you
 * redistribute a text without their trademark, you remove the Project Gutenberg header, footer
 * and references — which `stripGutenbergBoilerplate` does.
 */
export { isHeading, splitIntoSections, toParagraphs, type Section } from '../../src/lib/text/sections';

export function stripGutenbergBoilerplate(raw: string): string {
  const text = raw.replace(/\r\n?/g, '\n').replace(/^﻿/, '');
  const start = text.search(/^\*\*\*\s*START OF (THE|THIS) PROJECT GUTENBERG EBOOK.*$/im);
  const end = text.search(/^\*\*\*\s*END OF (THE|THIS) PROJECT GUTENBERG EBOOK.*$/im);
  let body = text;
  if (start !== -1) body = body.slice(body.indexOf('\n', start) + 1);
  if (end !== -1) body = body.slice(0, body.search(/^\*\*\*\s*END OF (THE|THIS) PROJECT GUTENBERG EBOOK.*$/im));
  return body
    .split('\n')
    .filter((line) => !/project gutenberg/i.test(line))
    .join('\n')
    .trim();
}
