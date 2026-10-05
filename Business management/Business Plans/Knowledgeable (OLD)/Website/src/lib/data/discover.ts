"use client";

import { invalidateCatalog } from '@/lib/data/books';
import type { Locale } from '@/lib/i18n/core';

export interface ExternalBook {
  workId: string;
  title: string;
  author: string;
  firstPublished?: number;
  coverUrl?: string;
  archiveId?: string;
  openLibraryUrl: string;
}

export interface ExternalPaper {
  id: string;
  title: string;
  authors: string[];
  year?: number;
  venue?: string;
  url: string;
  openAccessUrl?: string;
  citedBy: number;
  pmcid?: string;
}

export interface OpenPaper {
  pmcid: string;
  title: string;
  authors: string;
  journal?: string;
  year?: string;
  license: string;
}

export interface WikiArticle {
  lang: 'en' | 'es' | 'fr';
  title: string;
  snippet: string;
}

export interface DiscoverResults {
  books: ExternalBook[];
  papers: ExternalPaper[];
  openPapers: OpenPaper[];
  articles: WikiArticle[];
}

export async function discover(term: string, locale: Locale): Promise<DiscoverResults> {
  const res = await fetch(`/api/discover?q=${encodeURIComponent(term)}&locale=${locale}`, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`discover ${res.status}`);
  return res.json();
}

export type ImportRequest =
  | { source: 'openlibrary'; workId: string }
  | { source: 'europepmc'; pmcid: string }
  | { source: 'wikipedia'; lang: WikiArticle['lang']; title: string };

export class ImportFailed extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

/** Copies a work into our library (or finds it) and returns its id. */
export async function importToLibrary(request: ImportRequest): Promise<string> {
  const res = await fetch('/api/library/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new ImportFailed((await res.json().catch(() => ({}))).error ?? String(res.status));
  invalidateCatalog();
  return (await res.json()).bookId as string;
}
