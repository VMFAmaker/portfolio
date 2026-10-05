import { NextResponse, type NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { isSameOriginRequest, readJsonBody } from '@/lib/auth/request';
import { rateLimit } from '@/lib/server/rate-limit';
import {
  ImportError,
  importEuropePmc,
  importOpenLibrary,
  importWikipedia,
  WIKIPEDIA_LANGUAGES,
  type WikipediaLanguage,
} from '@/lib/server/library-import';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Adds a book, paper or article to the catalogue, copying its full text into our own storage.
 * The catalogue is admin-write-only in the rules, so the server does the write — with content
 * fetched by the server from the source, never taken from the request.
 */
export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await readJsonBody(req);
  if (!body) return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  if (!rateLimit(`import:${user.uid}`, 20, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  try {
    let bookId: string;
    if (body.source === 'openlibrary' && typeof body.workId === 'string' && /^OL\d{1,12}W$/.test(body.workId)) {
      bookId = await importOpenLibrary(body.workId);
    } else if (body.source === 'europepmc' && typeof body.pmcid === 'string' && /^PMC\d{1,12}$/.test(body.pmcid)) {
      bookId = await importEuropePmc(body.pmcid);
    } else if (
      body.source === 'wikipedia' &&
      WIKIPEDIA_LANGUAGES.includes(body.lang as WikipediaLanguage) &&
      typeof body.title === 'string' && body.title.length > 0 && body.title.length <= 250
    ) {
      bookId = await importWikipedia(body.lang as WikipediaLanguage, body.title);
    } else {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
    }
    return NextResponse.json({ bookId });
  } catch (error) {
    if (error instanceof ImportError) {
      const status = error.code === 'not_found' ? 404 : error.code === 'upstream' ? 502 : 422;
      return NextResponse.json({ error: error.code }, { status });
    }
    console.error('Library import failed', { body, error });
    return NextResponse.json({ error: 'import_failed' }, { status: 500 });
  }
}
