"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bookmark as BookmarkIcon, Highlighter, Loader2, MessageSquareQuote, NotebookPen, Search, StickyNote } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/LanguageContext';
import { listAllNotes } from '@/lib/data/notes';
import { highlightClass } from '@/components/reader/highlight-colours';
import type { Annotation, Bookmark, Reflection } from '@/lib/types';
import { cn } from '@/lib/utils';

interface WorkNotes {
  bookId: string;
  bookTitle: string;
  annotations: Annotation[];
  bookmarks: Bookmark[];
  reflection?: Reflection;
  latest: string;
}

function readerLink(bookId: string, chapterIndex: number, paragraphIndex: number, annotationId?: string) {
  return `/read/${bookId}?chapter=${chapterIndex}&p=${paragraphIndex}${annotationId ? `&a=${annotationId}` : ''}`;
}

/** Every highlight, note, bookmark and reflection, grouped by work. Private to the reader. */
export default function NotesPage() {
  const { user } = useCurrentUser();
  const { t, relative } = useI18n();
  const [data, setData] = useState<{ annotations: Annotation[]; bookmarks: Bookmark[]; reflections: Reflection[] } | null>(null);
  const [error, setError] = useState(false);
  const [term, setTerm] = useState('');

  useEffect(() => {
    listAllNotes(user.uid).then(setData).catch(() => setError(true));
  }, [user.uid]);

  const works = useMemo<WorkNotes[]>(() => {
    if (!data) return [];
    const byId = new Map<string, WorkNotes>();
    const get = (bookId: string, bookTitle: string, at: string) => {
      const existing = byId.get(bookId) ?? { bookId, bookTitle, annotations: [], bookmarks: [], latest: at };
      if (at > existing.latest) existing.latest = at;
      byId.set(bookId, existing);
      return existing;
    };
    data.annotations.forEach((a) => get(a.bookId, a.bookTitle, a.updatedAt).annotations.push(a));
    data.bookmarks.forEach((b) => get(b.bookId, b.bookTitle, b.createdAt).bookmarks.push(b));
    data.reflections.forEach((r) => {
      get(r.bookId, r.bookTitle, r.updatedAt).reflection = r;
    });
    const q = term.trim().toLowerCase();
    return Array.from(byId.values())
      .map((w) => ({
        ...w,
        annotations: [...w.annotations].sort((a, b) => a.chapterIndex - b.chapterIndex || a.paragraphIndex - b.paragraphIndex),
        bookmarks: [...w.bookmarks].sort((a, b) => a.chapterIndex - b.chapterIndex || a.paragraphIndex - b.paragraphIndex),
      }))
      .filter((w) => !q || w.bookTitle.toLowerCase().includes(q)
        || w.annotations.some((a) => a.quote.toLowerCase().includes(q) || a.note?.toLowerCase().includes(q))
        || w.reflection?.answers.some((x) => x.answer.toLowerCase().includes(q)))
      .sort((a, b) => b.latest.localeCompare(a.latest));
  }, [data, term]);

  return (
    <div className="max-w-3xl mx-auto w-full space-y-6 py-4">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold flex items-center gap-2"><NotebookPen className="h-7 w-7 text-primary" /> {t('My notes')}</h1>
        <p className="text-muted-foreground">{t('Your highlights, notes, bookmarks and reflections. Only you can see them.')}</p>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder={t('Search your notes')} className="pl-9" />
        </div>
      </div>

      {error ? (
        <p className="text-destructive">{t('Could not load your notes.')}</p>
      ) : !data ? (
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
      ) : works.length === 0 ? (
        <Card className="bg-muted/30 text-center">
          <CardContent className="space-y-3 p-8">
            <Highlighter className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              {term ? t('Nothing matches your search.') : t('While reading, select any text to highlight it or add a note, and use the bookmark icon to save your place.')}
            </p>
            {!term && <Button asChild><Link href="/library">{t('Browse the library')}</Link></Button>}
          </CardContent>
        </Card>
      ) : (
        works.map((work) => (
          <Card key={work.bookId}>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">
                <Link href={`/book/${work.bookId}`} className="hover:underline">{work.bookTitle}</Link>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {[
                  work.annotations.length ? t(work.annotations.length === 1 ? '1 highlight' : '{count} highlights', { count: work.annotations.length }) : null,
                  work.bookmarks.length ? t(work.bookmarks.length === 1 ? '1 bookmark' : '{count} bookmarks', { count: work.bookmarks.length }) : null,
                  work.reflection ? t('Reflection') : null,
                ].filter(Boolean).join(' · ')} · {relative(work.latest)}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {work.reflection && work.reflection.answers.length > 0 && (
                <section className="space-y-2 rounded-lg bg-muted/40 p-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2"><MessageSquareQuote className="h-4 w-4" /> {t('Your reflection')}</h3>
                  {work.reflection.answers.map((a, i) => (
                    <div key={i}>
                      <p className="text-xs font-medium text-muted-foreground">{a.question}</p>
                      <p className="text-sm whitespace-pre-wrap">{a.answer}</p>
                    </div>
                  ))}
                </section>
              )}
              {work.bookmarks.length > 0 && (
                <section className="space-y-1">
                  <h3 className="text-sm font-semibold flex items-center gap-2"><BookmarkIcon className="h-4 w-4" /> {t('Bookmarks')}</h3>
                  <ul className="space-y-1">
                    {work.bookmarks.map((b) => (
                      <li key={b.id}>
                        <Link href={readerLink(b.bookId, b.chapterIndex, b.paragraphIndex)} className="block rounded-md p-2 hover:bg-muted">
                          <span className="text-xs font-semibold text-muted-foreground">{b.chapterTitle}</span>
                          <span className="block text-sm line-clamp-1">{b.snippet}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {work.annotations.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2"><Highlighter className="h-4 w-4" /> {t('Highlights and notes')}</h3>
                  <ul className="space-y-2">
                    {work.annotations.map((a) => (
                      <li key={a.id}>
                        <Link href={readerLink(a.bookId, a.chapterIndex, a.paragraphIndex, a.id)} className="block rounded-md border p-3 hover:bg-muted/50">
                          <p className={cn('rounded px-1 font-serif text-sm', highlightClass(a.colour))}>{a.quote}</p>
                          {a.note && <p className="mt-2 text-sm flex gap-1.5"><StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0" />{a.note}</p>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
