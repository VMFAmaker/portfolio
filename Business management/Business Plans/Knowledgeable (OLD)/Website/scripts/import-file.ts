/**
 * Adds a book, paper or article from a file you have the rights to (an EPUB or plain-text file)
 * to the library, so it can be read in the app with highlights, notes and bookmarks.
 *
 *   npm run import:file -- <file.epub|file.txt> --title "Title" --author "Author" [options]
 *
 * Options:
 *   --kind book|paper|article   (default: book)
 *   --topics physics,history    topic ids from src/lib/taxonomy.ts (default: guessed from the title)
 *   --year 2024                 publication year
 *   --description "…"           short blurb shown on the book page
 *   --id my-book                catalogue id (default: made from the title)
 *   --licence licensed|public-domain|cc-by|cc-by-sa|cc0   (default: licensed)
 *   --attribution "…"           credit line shown in the reader (needed for CC BY / CC BY-SA)
 *   --prod                      write to the real project instead of the emulators
 *
 * Text goes to Firestore (books/{id}/chapters) and the original file to Cloud Storage
 * (library/{id}/), the same "own storage" every other work in the library uses.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { config } from 'dotenv';
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import JSZip from 'jszip';
import { parse, type HTMLElement } from 'node-html-parser';
import { normaliseSections, splitIntoSections, type Section } from '../src/lib/text/sections';
import { ALL_TOPIC_IDS, topicsFromText } from '../src/lib/taxonomy';
import type { WorkKind, WorkLicense } from '../src/lib/types';

config({ path: '.env.local' });
config();

const args = process.argv.slice(2);
function option(name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

const file = args.find((a, i) => !a.startsWith('--') && (i === 0 || !args[i - 1].startsWith('--')));
const title = option('title');
const author = option('author') ?? '';
const kind = (option('kind') ?? 'book') as WorkKind;
const licence = (option('licence') ?? option('license') ?? 'licensed') as WorkLicense;
const prod = args.includes('--prod');

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

if (!file || !title) fail('Usage: npm run import:file -- <file.epub|file.txt> --title "Title" --author "Author" [--kind book|paper|article]');
if (!['book', 'paper', 'article'].includes(kind)) fail(`--kind must be book, paper or article (got "${kind}")`);
if (!['licensed', 'public-domain', 'cc-by', 'cc-by-sa', 'cc0'].includes(licence)) fail(`Unknown licence "${licence}"`);
if ((licence === 'cc-by' || licence === 'cc-by-sa') && !option('attribution')) fail('CC BY works need --attribution "…" (credit shown in the reader).');
if (!process.env.FIRESTORE_EMULATOR_HOST && !prod) fail('FIRESTORE_EMULATOR_HOST is not set. To import into the REAL project, re-run with --prod.');

const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET ?? process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
initializeApp(
  process.env.FIRESTORE_EMULATOR_HOST
    ? { projectId, storageBucket }
    : {
        projectId,
        storageBucket,
        credential: process.env.FIREBASE_SERVICE_ACCOUNT_KEY ? cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)) : applicationDefault(),
      }
);

function slug(text: string): string {
  return text.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

const BLOCKS = new Set(['p', 'li', 'blockquote', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'dd', 'dt', 'figcaption']);

/** Paragraph texts of one XHTML chapter, plus its first heading. */
function chapterParagraphs(xhtml: string): { heading?: string; paragraphs: string[] } {
  const root = parse(xhtml, { blockTextElements: { script: false, style: false } });
  const body = root.querySelector('body') ?? root;
  const paragraphs: string[] = [];
  let heading: string | undefined;
  const walk = (el: HTMLElement) => {
    const tag = el.tagName?.toLowerCase();
    if (tag && BLOCKS.has(tag)) {
      const text = el.textContent.replace(/\s+/g, ' ').trim();
      if (!text) return;
      if (/^h[1-6]$/.test(tag) && !heading && paragraphs.length === 0) heading = text.slice(0, 200);
      else paragraphs.push(text);
      return;
    }
    for (const child of el.childNodes) if ((child as HTMLElement).tagName) walk(child as HTMLElement);
  };
  walk(body as HTMLElement);
  return { heading, paragraphs };
}

/** Reads an EPUB in reading order (its "spine"), one section per chapter file. */
async function epubSections(buffer: Buffer): Promise<Section[]> {
  const zip = await JSZip.loadAsync(buffer);
  const container = await zip.file('META-INF/container.xml')?.async('string');
  const opfPath = container?.match(/full-path="([^"]+)"/)?.[1];
  if (!opfPath) fail('This EPUB has no META-INF/container.xml — is the file damaged?');
  const opf = parse(await zip.file(opfPath)!.async('string'));
  const base = path.posix.dirname(opfPath);
  const manifest = new Map(opf.querySelectorAll('manifest item').map((item) => [item.getAttribute('id'), item.getAttribute('href')]));
  const groups: Array<{ heading?: string; paragraphs: string[] }> = [];
  for (const ref of opf.querySelectorAll('spine itemref')) {
    const href = manifest.get(ref.getAttribute('idref'));
    if (!href) continue;
    const entry = zip.file(path.posix.join(base === '.' ? '' : base, decodeURIComponent(href)));
    if (!entry) continue;
    const chapter = chapterParagraphs(await entry.async('string'));
    if (chapter.paragraphs.length > 0) groups.push(chapter);
  }
  if (groups.length === 0) fail('No readable text found in this EPUB (it may be DRM-protected).');
  return normaliseSections(groups, true);
}

async function main() {
  const filePath = path.resolve(file!);
  const extension = path.extname(filePath).toLowerCase();
  const buffer = readFileSync(filePath);
  let sections: Section[];
  let contentType: string;
  if (extension === '.epub') {
    sections = await epubSections(buffer);
    contentType = 'application/epub+zip';
  } else if (extension === '.txt' || extension === '.md') {
    sections = splitIntoSections(buffer.toString('utf8'));
    contentType = 'text/plain; charset=utf-8';
  } else {
    fail('Only .epub and .txt files are supported. Convert PDFs to EPUB first (e.g. with Calibre).');
  }
  if (sections.length === 0) fail('No readable text found.');

  const topicsArg = option('topics')?.split(',').map((t) => t.trim()).filter(Boolean);
  const unknown = topicsArg?.filter((t) => !ALL_TOPIC_IDS.includes(t));
  if (unknown?.length) fail(`Unknown topic ids: ${unknown.join(', ')}`);
  const topics = topicsArg?.length ? topicsArg.slice(0, 3) : topicsFromText([title!, option('description') ?? '']);

  const bookId = option('id') ?? `own-${slug(title!)}`;
  const { saveWork } = await import('../src/lib/server/library-import');
  await saveWork(
    bookId,
    {
      kind,
      title: title!,
      author,
      description: option('description'),
      publishedYear: option('year'),
      topics: topics.length ? topics : ['education'],
      license: licence,
      attribution: option('attribution'),
      sourceUrl: '',
    },
    sections,
    { text: buffer, extension: extension.slice(1), contentType }
  );
  const words = sections.reduce((sum, s) => sum + s.wordCount, 0);
  console.log(`✓ Imported "${title}" as books/${bookId}: ${sections.length} sections, ${words.toLocaleString('en-GB')} words.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
