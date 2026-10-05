"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, NotebookPen, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookTile } from '@/components/books/BookTile';
import { listCatalog, searchCatalog } from '@/lib/data/books';
import { useCurrentUser } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/LanguageContext';
import { expandInterests } from '@/lib/taxonomy';
import { KIND_PLURALS } from '@/components/library/kind-labels';
import type { Book, WorkKind } from '@/lib/types';
import { cn } from '@/lib/utils';

type KindFilter = 'all' | WorkKind;

export default function LibraryPage() {
  const { profile } = useCurrentUser();
  const { t, topic: topicName } = useI18n();
  const [works, setWorks] = useState<Book[] | null>(null);
  const [error, setError] = useState(false);
  const [term, setTerm] = useState('');
  const [topic, setTopic] = useState<string | null>(null);
  const [kind, setKind] = useState<KindFilter>('all');

  useEffect(() => {
    listCatalog().then(setWorks).catch(() => setError(true));
  }, []);

  const topics = useMemo(() => {
    const counts = new Map<string, number>();
    for (const work of works ?? []) for (const id of work.topics) counts.set(id, (counts.get(id) ?? 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([id]) => id);
  }, [works]);

  const visible = useMemo(() => {
    let list = works ?? [];
    if (kind !== 'all') list = list.filter((w) => w.kind === kind);
    if (term.trim()) list = searchCatalog(list, term);
    if (topic) list = list.filter((w) => w.topics.includes(topic));
    // Works matching the reader's interests come first.
    const { primary } = expandInterests(profile.interests);
    const score = (w: Book) => (w.topics.some((id) => primary.includes(id)) ? 0 : 1);
    return [...list].sort((a, b) => score(a) - score(b) || a.title.localeCompare(b.title));
  }, [works, kind, term, topic, profile.interests]);

  const readable = visible.filter((w) => w.readable);
  const trackOnly = visible.filter((w) => !w.readable);

  return (
    <div className="space-y-8 max-w-5xl mx-auto w-full">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-3xl font-bold">{t('Library')}</h1>
          <div className="flex gap-2">
            <Button variant="outline" asChild><Link href="/notes"><NotebookPen className="mr-2 h-4 w-4" />{t('My notes')}</Link></Button>
            <Button variant="outline" asChild><Link href={`/profile/${profile.id}?tab=reading`}>{t('My readings')}</Link></Button>
          </div>
        </div>
        <Tabs value={kind} onValueChange={(v) => setKind(v as KindFilter)}>
          <TabsList className="flex w-full max-w-xl">
            <TabsTrigger value="all" className="flex-1">{t('All')}</TabsTrigger>
            {(['book', 'paper', 'article'] as const).map((k) => (
              <TabsTrigger key={k} value={k} className="flex-1">{t(KIND_PLURALS[k])}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder={t('Search titles or authors')} className="pl-9" />
        </div>
        {topics.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {topics.slice(0, 16).map((id) => (
              <button key={id} type="button" onClick={() => setTopic(topic === id ? null : id)}>
                <Badge variant={topic === id ? 'default' : 'outline'} className={cn('cursor-pointer')}>{topicName(id)}</Badge>
              </button>
            ))}
          </div>
        )}
      </div>

      {error ? (
        <p className="text-destructive">{t('Could not load the library.')}</p>
      ) : !works ? (
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
      ) : (
        <>
          <section className="space-y-3">
            <div>
              <h2 className="text-2xl font-semibold">{t('Read in Knowledgeable')}</h2>
              <p className="text-sm text-muted-foreground">
                {t('Books, academic papers and articles stored in our library. Your progress, highlights and notes are saved automatically.')}
              </p>
            </div>
            {readable.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {readable.map((w) => <BookTile key={w.id} bookId={w.id} title={w.title} author={w.author} coverUrl={w.coverUrl} kind={w.kind} readable />)}
              </div>
            ) : (
              <p className="text-muted-foreground">{t('Nothing readable matches yet. Search to add papers and articles to the library.')}</p>
            )}
          </section>
          {trackOnly.length > 0 && (
            <section className="space-y-3">
              <div>
                <h2 className="text-2xl font-semibold">{t('Track your reading')}</h2>
                <p className="text-sm text-muted-foreground">{t('Books you read elsewhere — add them to your lists and share ideas from them. Search to find any book.')}</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {trackOnly.map((w) => <BookTile key={w.id} bookId={w.id} title={w.title} author={w.author} coverUrl={w.coverUrl} kind={w.kind} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
