/* eslint-disable @typescript-eslint/no-explicit-any -- parses untyped third-party JSON defensively */
import 'server-only';

import { adminDb, adminStorage } from '@/lib/firebase/admin';
import { normaliseSections, splitIntoSections, type Section } from '@/lib/text/sections';
import { parseJats } from '@/lib/text/jats';
import { parseWikipediaHtml } from '@/lib/text/wikipedia';
import { topicsFromText } from '@/lib/taxonomy';
import { getOpenLibraryWork } from '@/lib/server/discover';
import type { WorkKind, WorkLicense } from '@/lib/types';

/**
 * Imports works into OUR storage: the full text goes into Firestore (books/{id}/chapters) and the
 * original file into Cloud Storage (library/{id}/source.*), so everything is read in our own
 * reader with highlights, notes and bookmarks — no third-party viewers.
 *
 * Only openly licensed material is imported: public-domain scans, CC BY / CC BY-SA / CC0 papers,
 * and Wikipedia (CC BY-SA, with the required attribution).
 */

export class ImportError extends Error {
  constructor(public readonly code: 'not_found' | 'not_open_licence' | 'no_text' | 'upstream') {
    super(code);
  }
}

const MAX_SOURCE_BYTES = 8 * 1024 * 1024;

async function fetchText(url: string, accept = 'text/plain'): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Knowledgeable/1.0 (learning platform)', Accept: accept },
    signal: AbortSignal.timeout(20000),
  });
  if (res.status === 404) throw new ImportError('not_found');
  if (!res.ok) throw new ImportError('upstream');
  const length = Number(res.headers.get('content-length') ?? 0);
  if (length > MAX_SOURCE_BYTES) throw new ImportError('upstream');
  const text = await res.text();
  if (text.length > MAX_SOURCE_BYTES) throw new ImportError('upstream');
  return text;
}

async function fetchJson(url: string): Promise<any> {
  return JSON.parse(await fetchText(url, 'application/json'));
}

export interface WorkData {
  kind: WorkKind;
  title: string;
  author: string;
  description?: string;
  publishedYear?: string;
  topics: string[];
  coverUrl?: string;
  license: WorkLicense;
  attribution?: string;
  sourceUrl: string;
  openLibraryId?: string;
  archiveId?: string;
  journal?: string;
  doi?: string;
  pmcid?: string;
}

/** Writes the catalogue entry, its chapters and (best effort) the original source file. */
export async function saveWork(
  bookId: string,
  work: WorkData,
  sections: Section[],
  source?: { text: string | Buffer; extension: string; contentType: string }
): Promise<void> {
  const db = adminDb();
  const ref = db.collection('books').doc(bookId);
  await db.recursiveDelete(ref.collection('chapters'));

  for (let i = 0; i < sections.length; i += 400) {
    const batch = db.batch();
    sections.slice(i, i + 400).forEach((section, offset) => {
      const index = i + offset;
      batch.set(ref.collection('chapters').doc(String(index)), { index, ...section });
    });
    await batch.commit();
  }

  const data: Record<string, unknown> = {
    ...Object.fromEntries(Object.entries(work).filter(([, v]) => v !== undefined && v !== '')),
    readable: sections.length > 0,
    chapterCount: sections.length,
    wordCount: sections.reduce((sum, s) => sum + s.wordCount, 0),
  };
  await ref.set(data);

  if (source) {
    try {
      await adminStorage()
        .bucket()
        .file(`library/${bookId}/source.${source.extension}`)
        .save(source.text, { contentType: source.contentType, resumable: false });
    } catch (error) {
      console.warn('Could not store source file', { bookId, error });
    }
  }
}

async function alreadyReadable(bookId: string): Promise<boolean> {
  const snap = await adminDb().collection('books').doc(bookId).get();
  return snap.exists && snap.get('readable') === true && (snap.get('chapterCount') ?? 0) > 0;
}

// ---------- Open Library + Internet Archive (public-domain books) ----------

export async function importOpenLibrary(workId: string): Promise<string> {
  const bookId = `ol-${workId}`;
  if (await alreadyReadable(bookId)) return bookId;
  const existing = await adminDb().collection('books').doc(bookId).get();
  if (existing.exists && !existing.get('archiveId')) return bookId; // metadata-only, nothing more to fetch

  const work = await getOpenLibraryWork(workId);
  let sections: Section[] = [];
  let source: { text: string; extension: string; contentType: string } | undefined;
  if (work.archiveId) {
    try {
      const text = await fetchText(`https://archive.org/download/${work.archiveId}/${work.archiveId}_djvu.txt`);
      sections = splitIntoSections(text.replace(/\r\n?/g, '\n'));
      source = { text, extension: 'txt', contentType: 'text/plain; charset=utf-8' };
    } catch (error) {
      console.warn('No scanned text for', work.archiveId, error);
    }
  }

  await saveWork(bookId, {
    kind: 'book',
    title: work.title,
    author: work.author,
    description: work.description,
    publishedYear: work.firstPublished ? String(work.firstPublished) : undefined,
    topics: topicsFromText(work.subjects),
    coverUrl: work.coverUrl,
    license: sections.length ? 'public-domain' : 'metadata-only',
    attribution: sections.length ? 'Public-domain text digitised by the Internet Archive.' : undefined,
    sourceUrl: work.openLibraryUrl,
    openLibraryId: workId,
    archiveId: work.archiveId,
  }, sections, source);
  return bookId;
}

// ---------- Europe PMC (open-access academic papers) ----------

const OPEN_LICENCES: Record<string, WorkLicense> = { 'cc by': 'cc-by', 'cc-by': 'cc-by', 'cc by-sa': 'cc-by-sa', 'cc0': 'cc0' };

export async function importEuropePmc(pmcid: string): Promise<string> {
  const bookId = `pmc-${pmcid}`;
  if (await alreadyReadable(bookId)) return bookId;

  const params = new URLSearchParams({ query: `PMCID:${pmcid}`, resultType: 'core', format: 'json', pageSize: '1' });
  const meta = (await fetchJson(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?${params}`))?.resultList?.result?.[0];
  if (!meta) throw new ImportError('not_found');
  const license = OPEN_LICENCES[String(meta.license ?? '').toLowerCase().trim()];
  if (!license) throw new ImportError('not_open_licence');

  const xml = await fetchText(`https://www.ebi.ac.uk/europepmc/webservices/rest/${pmcid}/fullTextXML`, 'application/xml');
  const paper = parseJats(xml);
  const groups = [
    ...(paper.abstract.length ? [{ heading: 'Abstract', paragraphs: paper.abstract }] : []),
    ...paper.sections,
  ];
  const sections = normaliseSections(groups, true);
  if (sections.length === 0) throw new ImportError('no_text');

  const keywords: string[] = [
    ...(meta.keywordList?.keyword ?? []),
    ...((meta.meshHeadingList?.meshHeading ?? []).map((m: any) => m.descriptorName)),
    paper.journal ?? '',
    paper.title,
  ].map(String);
  const authors = paper.authors.length ? paper.authors : String(meta.authorString ?? '').split(',').map((a) => a.trim()).filter(Boolean);
  const authorLine = authors.length > 3 ? `${authors.slice(0, 3).join(', ')} et al.` : authors.join(', ');

  await saveWork(bookId, {
    kind: 'paper',
    title: paper.title || String(meta.title ?? 'Untitled'),
    author: authorLine,
    description: paper.abstract.join(' ').slice(0, 1500) || undefined,
    publishedYear: paper.year ?? (meta.pubYear ? String(meta.pubYear) : undefined),
    topics: topicsFromText(keywords),
    license,
    attribution: `${authorLine}${paper.journal ? `, ${paper.journal}` : ''}${paper.year ? ` (${paper.year})` : ''}. Licensed ${license.toUpperCase().replace('CC-', 'CC ')}.`,
    sourceUrl: `https://europepmc.org/article/PMC/${pmcid}`,
    journal: paper.journal ?? meta.journalInfo?.journal?.title,
    doi: paper.doi ?? meta.doi,
    pmcid,
  }, sections, { text: xml, extension: 'xml', contentType: 'application/xml' });
  return bookId;
}

// ---------- Wikipedia (encyclopaedia articles, CC BY-SA) ----------

export const WIKIPEDIA_LANGUAGES = ['en', 'es', 'fr'] as const;
export type WikipediaLanguage = (typeof WIKIPEDIA_LANGUAGES)[number];

const OVERVIEW: Record<WikipediaLanguage, string> = { en: 'Overview', es: 'Introducción', fr: 'Introduction' };

export async function importWikipedia(lang: WikipediaLanguage, title: string): Promise<string> {
  const params = new URLSearchParams({
    action: 'parse', page: title, prop: 'text|categories', format: 'json', formatversion: '2', redirects: '1',
  });
  const data = await fetchJson(`https://${lang}.wikipedia.org/w/api.php?${params}`);
  if (data?.error || !data?.parse) throw new ImportError('not_found');
  const page = data.parse;
  const bookId = `wp-${lang}-${page.pageid}`;
  if (await alreadyReadable(bookId)) return bookId;

  const groups = parseWikipediaHtml(String(page.text ?? ''), OVERVIEW[lang]);
  const sections = normaliseSections(groups, true);
  if (sections.length === 0) throw new ImportError('no_text');
  const pageTitle = String(page.title);
  const url = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(pageTitle.replace(/ /g, '_'))}`;

  await saveWork(bookId, {
    kind: 'article',
    title: pageTitle,
    author: 'Wikipedia contributors',
    description: groups[0]?.paragraphs[0]?.slice(0, 600),
    topics: topicsFromText([pageTitle, ...((page.categories ?? []).map((c: any) => String(c.category ?? '').replace(/_/g, ' ')))]),
    license: 'cc-by-sa',
    attribution: `Text from the Wikipedia article “${pageTitle}” by Wikipedia contributors, available under CC BY-SA 4.0. Reformatted for reading.`,
    sourceUrl: url,
  }, sections, { text: String(page.text ?? ''), extension: 'html', contentType: 'text/html; charset=utf-8' });
  return bookId;
}
