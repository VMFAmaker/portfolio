"use client";

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2, Sparkles } from 'lucide-react';
import type { AISubjectExplanation, Book, Post, PublicProfile } from '@/lib/types';
import { explainSubject } from '@/ai/flows/explain-subject-flow';
import { PostCard } from '@/components/posts/PostCard';
import { BookTile } from '@/components/books/BookTile';
import { ExternalBookTile } from '@/components/books/ExternalBookTile';
import { PaperResult } from '@/components/PaperResult';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/contexts/LanguageContext';
import { listCatalog, searchCatalog } from '@/lib/data/books';
import { listPostsByTopic, searchPosts } from '@/lib/data/posts';
import { searchProfiles } from '@/lib/data/profiles';
import { discover, type ExternalBook, type ExternalPaper, type OpenPaper, type WikiArticle } from '@/lib/data/discover';
import { ImportButton } from '@/components/library/ImportButton';
import { FileText, Newspaper } from 'lucide-react';
import { safeExternalUrl } from '@/lib/safe-url';
import { topicLabel, topicsMatching } from '@/lib/taxonomy';
import { TOPIC_TRANSLATIONS } from '@/lib/i18n/topics';

const MAX_INITIAL_BOOKS = 5;

function topicNames(id: string): string[] {
  const tr = TOPIC_TRANSLATIONS[id];
  return [topicLabel(id), ...(tr ? [tr.es, tr.fr] : [])];
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-2xl font-semibold mb-4">{children}</h2>;
}

function SearchResults() {
  const searchParams = useSearchParams();
  const query = (searchParams.get('q') || '').trim().slice(0, 200);
  const { t, topic, locale } = useI18n();

  const [aiExplanation, setAiExplanation] = useState<AISubjectExplanation | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  const [topics, setTopics] = useState<string[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<PublicProfile[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(true);

  const [externalBooks, setExternalBooks] = useState<ExternalBook[]>([]);
  const [papers, setPapers] = useState<ExternalPaper[]>([]);
  const [openPapers, setOpenPapers] = useState<OpenPaper[]>([]);
  const [articles, setArticles] = useState<WikiArticle[]>([]);
  const [isLoadingExternal, setIsLoadingExternal] = useState(false);
  const [showAllBooks, setShowAllBooks] = useState(false);

  useEffect(() => {
    setAiExplanation(null);
    setAiError(null);
    if (!query) return;
    let cancelled = false;
    setIsLoadingAi(true);
    explainSubject({ searchQuery: query, language: locale })
      .then((result) => {
        if (cancelled) return;
        if (result.ok) setAiExplanation(result.data);
        else setAiError(result.error);
      })
      .catch(() => !cancelled && setAiError('The AI helper is unavailable right now. Please try again later.'))
      .finally(() => !cancelled && setIsLoadingAi(false));
    return () => {
      cancelled = true;
    };
  }, [query, locale]);

  // Our own catalogue, community posts and people — plus everything in topics the term names.
  useEffect(() => {
    setShowAllBooks(false);
    if (!query) {
      setIsLoadingResults(false);
      return;
    }
    let cancelled = false;
    setIsLoadingResults(true);
    const matchedTopics = topicsMatching(query, topicNames).slice(0, 3);
    setTopics(matchedTopics);
    Promise.all([
      listCatalog().catch(() => [] as Book[]),
      searchPosts(query).catch(() => [] as Post[]),
      Promise.all(matchedTopics.map((id) => listPostsByTopic(id, 10).catch(() => [] as Post[]))),
      searchProfiles(query).catch(() => [] as PublicProfile[]),
    ]).then(([catalog, keywordPosts, topicPosts, people]) => {
      if (cancelled) return;
      const direct = searchCatalog(catalog, query);
      const related = catalog.filter((b) => !direct.includes(b) && b.topics.some((id) => matchedTopics.includes(id)));
      setBooks([...direct, ...related]);
      const seen = new Set<string>();
      setPosts([...keywordPosts, ...topicPosts.flat()].filter((p) => !seen.has(p.id) && Boolean(seen.add(p.id))));
      setUsers(people);
      setIsLoadingResults(false);
    });
    return () => {
      cancelled = true;
    };
  }, [query]);

  // Open Library books and OpenAlex papers.
  useEffect(() => {
    setExternalBooks([]);
    setPapers([]);
    setOpenPapers([]);
    setArticles([]);
    if (!query) return;
    let cancelled = false;
    setIsLoadingExternal(true);
    discover(query, locale)
      .then((r) => {
        if (cancelled) return;
        setExternalBooks(r.books);
        setPapers(r.papers);
        setOpenPapers(r.openPapers);
        setArticles(r.articles);
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setIsLoadingExternal(false));
    return () => {
      cancelled = true;
    };
  }, [query, locale]);

  if (!query) {
    return <p className="text-muted-foreground text-lg">{t('Please enter a search term to begin.')}</p>;
  }

  const communityPapers = posts.filter((p) => p.type === 'article' || p.type === 'research');
  const communityPosts = posts.filter((p) => p.type !== 'article' && p.type !== 'research');
  const catalogOpenLibraryIds = new Set(books.map((b) => b.openLibraryId).filter(Boolean));
  const moreBooks = externalBooks.filter((b) => !catalogOpenLibraryIds.has(b.workId));
  const booksToShow = showAllBooks ? books : books.slice(0, MAX_INITIAL_BOOKS);
  const nothingFound = !isLoadingResults && !isLoadingExternal &&
    books.length + posts.length + users.length + moreBooks.length + papers.length + openPapers.length + articles.length === 0;

  return (
    <div className="space-y-10 max-w-5xl mx-auto w-full">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{t('Results for “{query}”', { query })}</h1>
        {topics.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {topics.map((id) => (
              <Link key={id} href={`/category/${id}`}><Badge variant="outline">{topic(id)}</Badge></Link>
            ))}
          </div>
        )}
      </div>

      {(isLoadingAi || aiExplanation || aiError) && (
        <Card className="bg-card/70 shadow-lg border border-primary/30">
          <CardHeader>
            <CardTitle className="text-xl text-primary flex items-center gap-2">
              <Sparkles className="h-5 w-5" /> {t('AI explanation')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingAi ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : aiError ? (
              <p className="text-sm text-muted-foreground">{t(aiError)}</p>
            ) : aiExplanation && (
              <>
                <p className="text-base">{aiExplanation.explanation}</p>
                {aiExplanation.aiSuggestedBooks && aiExplanation.aiSuggestedBooks.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground">{t('Suggested books')}</h3>
                    <ul className="list-disc pl-5 text-sm space-y-1 mt-1">
                      {aiExplanation.aiSuggestedBooks.map((book, idx) => (
                        <li key={idx}>
                          <Link href={`/search?q=${encodeURIComponent(book.title)}`} className="hover:underline">{book.title}</Link>
                          {book.author ? <span className="text-muted-foreground text-xs"> — {book.author}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {aiExplanation.aiSuggestedSources && aiExplanation.aiSuggestedSources.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground">{t('Suggested sources')}</h3>
                    <ul className="list-disc pl-5 text-sm space-y-1 mt-1">
                      {aiExplanation.aiSuggestedSources.map((source, idx) => {
                        const href = safeExternalUrl(source.url);
                        return (
                          <li key={idx}>
                            {source.title}
                            {href && (
                              <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="text-primary hover:underline text-xs ml-1">({t('link')})</a>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{t('AI-generated — double-check facts and sources before relying on them.')}</p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {nothingFound && <p className="text-muted-foreground text-lg">{t('No results found for “{query}”.', { query })}</p>}

      {/* ---------- books ---------- */}
      {(books.length > 0 || moreBooks.length > 0 || isLoadingExternal) && (
        <section className="space-y-6">
          {books.length > 0 && (
            <div>
              <div className="flex justify-between items-center">
                <SectionTitle>{t('Books in Knowledgeable')}</SectionTitle>
                {books.length > MAX_INITIAL_BOOKS && (
                  <Button variant="link" onClick={() => setShowAllBooks(!showAllBooks)} className="text-sm">
                    {showAllBooks ? t('Show less') : t('See all {count}', { count: books.length })}
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {booksToShow.map((b) => <BookTile key={b.id} bookId={b.id} title={b.title} author={b.author} coverUrl={b.coverUrl} readable={b.readable} />)}
              </div>
            </div>
          )}
          <div>
            <SectionTitle>{t('Related books')}</SectionTitle>
            {isLoadingExternal ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : moreBooks.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {moreBooks.slice(0, 10).map((b) => <ExternalBookTile key={b.workId} book={b} />)}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{t('From Open Library, a free catalogue of millions of books.')}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t('No related books found.')}</p>
            )}
          </div>
        </section>
      )}

      {/* ---------- academic papers ---------- */}
      {(communityPapers.length > 0 || papers.length > 0 || isLoadingExternal) && (
        <section className="space-y-4">
          <SectionTitle>{t('Academic papers')}</SectionTitle>
          {communityPapers.map((p) => <PostCard key={p.id} post={p} />)}
          {openPapers.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">{t('Open-access papers you can read here')}</h3>
              <ul className="space-y-3">
                {openPapers.map((paper) => (
                  <li key={paper.pmcid} className="rounded-lg border p-4 space-y-2">
                    <p className="font-semibold flex items-start gap-2"><FileText className="mt-1 h-4 w-4 shrink-0 text-primary" />{paper.title}</p>
                    <p className="text-sm text-muted-foreground">{[paper.authors, paper.year, paper.journal].filter(Boolean).join(' · ')}</p>
                    <ImportButton request={{ source: 'europepmc', pmcid: paper.pmcid }} label={t('Read in Knowledgeable')} size="sm" openReader />
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">{t('Openly licensed full texts from Europe PMC, stored in our library.')}</p>
            </div>
          )}
          {isLoadingExternal ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ) : papers.length > 0 && (
            <>
              <ul className="space-y-3">
                {papers.map((paper) => <PaperResult key={paper.id} paper={paper} />)}
              </ul>
              <p className="text-xs text-muted-foreground">{t('From OpenAlex, an open index of scholarly research.')}</p>
            </>
          )}
        </section>
      )}

      {/* ---------- encyclopaedia articles ---------- */}
      {articles.length > 0 && (
        <section className="space-y-4">
          <SectionTitle>{t('Encyclopaedia articles')}</SectionTitle>
          <ul className="space-y-3">
            {articles.map((article) => (
              <li key={`${article.lang}-${article.title}`} className="rounded-lg border p-4 space-y-2">
                <p className="font-semibold flex items-center gap-2"><Newspaper className="h-4 w-4 text-primary" />{article.title}</p>
                <p className="text-sm text-muted-foreground line-clamp-2">{article.snippet}</p>
                <ImportButton request={{ source: 'wikipedia', lang: article.lang, title: article.title }} label={t('Read in Knowledgeable')} size="sm" variant="secondary" openReader />
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">{t('From Wikipedia, under CC BY-SA, with credit shown in the reader.')}</p>
        </section>
      )}

      {/* ---------- community ---------- */}
      {!isLoadingResults && communityPosts.length > 0 && (
        <section className="space-y-6">
          <SectionTitle>{t('Posts')}</SectionTitle>
          {communityPosts.map((p) => <PostCard key={p.id} post={p} />)}
        </section>
      )}

      {!isLoadingResults && users.length > 0 && (
        <section>
          <SectionTitle>{t('People')}</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {users.map((u) => (
              <Link href={`/profile/${u.id}`} key={u.id}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={u.avatarUrl} alt={u.displayName} />
                      <AvatarFallback>{u.displayName.substring(0, 1)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{u.displayName}</p>
                      <p className="text-xs text-muted-foreground">@{u.handle}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{u.bio || t('No bio yet.')}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {isLoadingResults && <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
      <SearchResults />
    </Suspense>
  );
}
