/* eslint-disable @typescript-eslint/no-explicit-any -- parses untyped third-party JSON defensively */
import 'server-only';

/**
 * Looks up related books (Open Library), academic papers (OpenAlex, plus openly licensed full
 * texts from Europe PMC) and encyclopaedia articles (Wikipedia) for a search term. All are free,
 * key-less APIs. Only the search term is sent — never who is searching.
 */

export interface ExternalBook {
  /** Open Library work key, e.g. "OL45883W". */
  workId: string;
  title: string;
  author: string;
  firstPublished?: number;
  coverUrl?: string;
  /** Internet Archive identifier when the book is public domain and readable online. */
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
  /** Free full text, when one exists. */
  openAccessUrl?: string;
  citedBy: number;
  /** Set when the paper is in PubMed Central under an open licence we can import and host. */
  pmcid?: string;
}

/** An openly licensed paper whose full text can be imported into our library. */
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

const IMPORTABLE_LICENCES = new Set(['cc-by', 'cc by', 'cc-by-sa', 'cc by-sa', 'cc0', 'public-domain']);

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; value: unknown }>();

async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value as T;
  const value = await load();
  cache.set(key, { at: Date.now(), value });
  if (cache.size > 500) cache.delete(cache.keys().next().value as string);
  return value;
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Knowledgeable/1.0 (learning platform)', Accept: 'application/json' },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function httpsOnly(url: unknown): string | undefined {
  return typeof url === 'string' && url.startsWith('https://') ? url : undefined;
}

export function searchOpenLibrary(term: string): Promise<ExternalBook[]> {
  return cached(`ol:${term}`, async () => {
    const params = new URLSearchParams({
      q: term,
      limit: '10',
      fields: 'key,title,author_name,first_publish_year,cover_i,ebook_access,ia',
    });
    const data = (await getJson(`https://openlibrary.org/search.json?${params}`)) as { docs?: Array<Record<string, unknown>> };
    return (data.docs ?? [])
      .filter((d) => typeof d.key === 'string' && typeof d.title === 'string')
      .map((d) => {
        const workId = String(d.key).replace('/works/', '');
        const ia = Array.isArray(d.ia) ? (d.ia as string[]) : [];
        return {
          workId,
          title: String(d.title).slice(0, 300),
          author: Array.isArray(d.author_name) ? String(d.author_name[0] ?? '') : '',
          firstPublished: typeof d.first_publish_year === 'number' ? d.first_publish_year : undefined,
          coverUrl: typeof d.cover_i === 'number' ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : undefined,
          archiveId: d.ebook_access === 'public' && ia[0] && /^[\w.-]+$/.test(ia[0]) ? ia[0] : undefined,
          openLibraryUrl: `https://openlibrary.org/works/${workId}`,
        };
      })
      .filter((b) => /^OL\d+W$/.test(b.workId));
  });
}

export function searchOpenAlex(term: string): Promise<ExternalPaper[]> {
  return cached(`oa:${term}`, async () => {
    const params = new URLSearchParams({
      search: term,
      per_page: '8',
      select: 'id,display_name,publication_year,authorships,primary_location,open_access,cited_by_count,doi,ids,best_oa_location',
    });
    if (process.env.OPENALEX_EMAIL) params.set('mailto', process.env.OPENALEX_EMAIL);
    const data = (await getJson(`https://api.openalex.org/works?${params}`)) as { results?: Array<Record<string, any>> };
    return (data.results ?? [])
      .filter((w) => typeof w.display_name === 'string')
      .map((w) => ({
        id: String(w.id),
        title: String(w.display_name).replace(/<[^>]+>/g, '').slice(0, 300),
        authors: (Array.isArray(w.authorships) ? w.authorships : [])
          .slice(0, 3)
          .map((a: any) => String(a?.author?.display_name ?? ''))
          .filter(Boolean),
        year: typeof w.publication_year === 'number' ? w.publication_year : undefined,
        venue: typeof w.primary_location?.source?.display_name === 'string' ? w.primary_location.source.display_name : undefined,
        url: httpsOnly(w.doi) ?? httpsOnly(w.primary_location?.landing_page_url) ?? String(w.id),
        openAccessUrl: httpsOnly(w.open_access?.oa_url),
        citedBy: typeof w.cited_by_count === 'number' ? w.cited_by_count : 0,
        pmcid: (() => {
          const raw = typeof w.ids?.pmcid === 'string' ? w.ids.pmcid : '';
          const id = raw.match(/PMC\d+/)?.[0];
          return id && IMPORTABLE_LICENCES.has(String(w.best_oa_location?.license ?? '').toLowerCase()) ? id : undefined;
        })(),
      }));
  });
}

/** Openly licensed (CC BY / CC BY-SA / CC0) papers with full text in Europe PMC. */
export function searchOpenPapers(term: string): Promise<OpenPaper[]> {
  return cached(`epmc:${term}`, async () => {
    const query = `(${term}) AND OPEN_ACCESS:y AND IN_EPMC:y AND (LICENSE:"cc by" OR LICENSE:"cc0" OR LICENSE:"cc by-sa")`;
    const params = new URLSearchParams({ query, format: 'json', resultType: 'lite', pageSize: '6' });
    const data = (await getJson(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?${params}`)) as any;
    return ((data?.resultList?.result ?? []) as any[])
      .filter((r) => typeof r.pmcid === 'string' && /^PMC\d+$/.test(r.pmcid))
      .map((r) => ({
        pmcid: r.pmcid,
        title: String(r.title ?? '').replace(/<[^>]+>/g, '').replace(/\.$/, '').slice(0, 300),
        authors: String(r.authorString ?? '').slice(0, 200),
        journal: typeof r.journalTitle === 'string' ? r.journalTitle : undefined,
        year: r.pubYear ? String(r.pubYear) : undefined,
        license: String(r.license ?? 'cc by'),
      }));
  });
}

/** Encyclopaedia articles in the reader's language. */
export function searchWikipedia(term: string, lang: WikiArticle['lang']): Promise<WikiArticle[]> {
  return cached(`wp:${lang}:${term}`, async () => {
    const params = new URLSearchParams({
      action: 'query', list: 'search', srsearch: term, srlimit: '5', format: 'json', formatversion: '2', srprop: 'snippet',
    });
    const data = (await getJson(`https://${lang}.wikipedia.org/w/api.php?${params}`)) as any;
    return ((data?.query?.search ?? []) as any[]).map((r) => ({
      lang,
      title: String(r.title),
      snippet: String(r.snippet ?? '').replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#0?39;/g, "'"),
    }));
  });
}

/** Details for importing a single Open Library work into the catalogue. */
export async function getOpenLibraryWork(workId: string): Promise<ExternalBook & { description?: string; subjects: string[] }> {
  const results = await searchOpenLibrary(`key:/works/${workId}`);
  const work = (await getJson(`https://openlibrary.org/works/${workId}.json`)) as Record<string, any>;
  const base = results.find((r) => r.workId === workId);
  const description = typeof work.description === 'string' ? work.description : work.description?.value;
  return {
    workId,
    title: String(work.title ?? base?.title ?? 'Untitled').slice(0, 300),
    author: base?.author ?? '',
    firstPublished: base?.firstPublished,
    coverUrl: base?.coverUrl ?? (Array.isArray(work.covers) && typeof work.covers[0] === 'number' ? `https://covers.openlibrary.org/b/id/${work.covers[0]}-M.jpg` : undefined),
    archiveId: base?.archiveId,
    openLibraryUrl: `https://openlibrary.org/works/${workId}`,
    description: typeof description === 'string' ? description.slice(0, 1500) : undefined,
    subjects: Array.isArray(work.subjects) ? work.subjects.slice(0, 20).map(String) : [],
  };
}
