import { NextResponse, type NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { rateLimit } from '@/lib/server/rate-limit';
import { searchOpenAlex, searchOpenLibrary, searchOpenPapers, searchWikipedia, type WikiArticle } from '@/lib/server/discover';

export const dynamic = 'force-dynamic';

const WIKI_LANG: Record<string, WikiArticle['lang']> = { 'en-GB': 'en', es: 'es', fr: 'fr' };

/** Related books, academic papers and encyclopaedia articles for the search page. */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const term = (req.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 200);
  const lang = WIKI_LANG[req.nextUrl.searchParams.get('locale') ?? ''] ?? 'en';
  if (term.length < 2) return NextResponse.json({ books: [], papers: [], openPapers: [], articles: [] });
  if (!rateLimit(`discover:${user.uid}`, 60, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const [books, papers, openPapers, articles] = await Promise.all([
    searchOpenLibrary(term).catch(() => []),
    searchOpenAlex(term).catch(() => []),
    searchOpenPapers(term).catch(() => []),
    searchWikipedia(term, lang).catch(() => []),
  ]);
  return NextResponse.json({ books, papers, openPapers, articles }, { headers: { 'Cache-Control': 'private, max-age=300' } });
}
