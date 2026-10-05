"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookTile } from '@/components/books/BookTile';
import { PostCard } from '@/components/posts/PostCard';
import { listBooksByTopic } from '@/lib/data/books';
import { listPostsByTopic } from '@/lib/data/posts';
import { getSubject, getTopic } from '@/lib/taxonomy';
import type { Book, Post } from '@/lib/types';
import { useI18n } from '@/contexts/LanguageContext';

const MAX_INITIAL_ITEMS = 4;

export default function CategoryPage() {
  const params = useParams();
  const { t, topic: topicName } = useI18n();
  const topicId = decodeURIComponent(params.categoryName as string);
  const topic = getTopic(topicId);
  const parent = topic?.parentId ? getTopic(topic.parentId) : undefined;
  const niches = topic && !topic.parentId ? getSubject(topic.id)?.nicheTopics ?? [] : [];

  const [books, setBooks] = useState<Book[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAllBooks, setShowAllBooks] = useState(false);

  useEffect(() => {
    if (!topic) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setShowAllBooks(false);
    Promise.all([listBooksByTopic(topicId).catch(() => []), listPostsByTopic(topicId).catch(() => [])]).then(([b, p]) => {
      if (cancelled) return;
      setBooks(b);
      setPosts(p);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [topicId, topic]);

  if (!topic) {
    return <p className="text-center text-muted-foreground py-10">{t('Unknown topic.')}</p>;
  }

  const booksToShow = showAllBooks ? books : books.slice(0, MAX_INITIAL_ITEMS);

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between gap-2">
        <div>
          {parent && (
            <Link href={`/category/${parent.id}`} className="text-sm text-muted-foreground hover:underline">
              {parent.emoji} {topicName(parent.id)}
            </Link>
          )}
          <h1 className="text-3xl font-bold">{topic.emoji} {topicName(topic.id)}</h1>
        </div>
        <Button variant="outline" asChild>
          <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" /> {t('Back to feed')}</Link>
        </Button>
      </div>

      {niches.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {niches.map((n) => (
            <Link key={n.id} href={`/category/${n.id}`}><Badge variant="outline">{n.emoji} {topicName(n.id)}</Badge></Link>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center min-h-[40vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {books.length > 0 && (
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">{t('Books ({count})', { count: books.length })}</h2>
                {books.length > MAX_INITIAL_ITEMS && (
                  <Button variant="link" onClick={() => setShowAllBooks(!showAllBooks)} className="text-sm">
                    {showAllBooks ? t('Show less') : t('See all {count}', { count: books.length })}
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {booksToShow.map((b) => <BookTile key={b.id} bookId={b.id} title={b.title} author={b.author} coverUrl={b.coverUrl} readable={b.readable} />)}
              </div>
            </section>
          )}

          {posts.length > 0 && (
            <section className="space-y-6">
              <h2 className="text-2xl font-semibold">{t('Posts')}</h2>
              {posts.map((p) => <PostCard key={p.id} post={p} />)}
            </section>
          )}

          {books.length === 0 && posts.length === 0 && (
            <p className="text-muted-foreground text-lg text-center py-10">
              {t('Nothing in {topic} yet — be the first to share something.', { topic: topicName(topic.id) })}
            </p>
          )}
        </>
      )}
    </div>
  );
}
