"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { ArrowLeft, BookOpen, BookOpenCheck, CheckCircle2, ExternalLink, Library, Loader2, MapPin, MessageSquareQuote, NotebookPen, PenLine, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ReflectionDialog } from '@/components/reader/ReflectionDialog';
import { KIND_LABELS } from '@/components/library/kind-labels';
import { safeExternalUrl } from '@/lib/safe-url';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { BookCover } from '@/components/books/BookCover';
import { PostCard } from '@/components/posts/PostCard';
import { useCurrentUser } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/LanguageContext';
import { getBook } from '@/lib/data/books';
import { getLibraryEntry, setReadingStatus } from '@/lib/data/library';
import { getDb } from '@/lib/firebase/client';
import { postFromDoc } from '@/lib/data/converters';
import { msg } from '@/lib/i18n/core';
import type { Book, LibraryEntry, Post, ReadingStatus } from '@/lib/types';

type StatusOption = ReadingStatus | 'none';

const statusOptions: { value: StatusOption; label: string; icon: React.ElementType }[] = [
  { value: 'want', label: msg('Want to read'), icon: Library },
  { value: 'reading', label: msg('Currently reading'), icon: BookOpen },
  { value: 'finished', label: msg('Already read'), icon: CheckCircle2 },
  { value: 'none', label: msg('None (remove from my lists)'), icon: XCircle },
];

/** Legal places to read a book we can't host: Open Library lending and local libraries. */
function WhereToRead({ book }: { book: Book }) {
  const { t } = useI18n();
  const q = encodeURIComponent(`${book.title} ${book.author}`.trim());
  const links = [
    {
      href: book.openLibraryId ? `https://openlibrary.org/works/${book.openLibraryId}` : `https://openlibrary.org/search?q=${q}`,
      label: msg('Borrow the e-book free from Open Library'),
      icon: ExternalLink,
    },
    { href: `https://search.worldcat.org/search?q=${q}`, label: msg('Find it in a library near you'), icon: MapPin },
  ];
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <p className="text-sm font-medium">{t('Where to read it')}</p>
      <p className="text-xs text-muted-foreground">
        {t("This book is still under copyright, so we can't host it — but you can track it, discuss it and share ideas from it here.")}
      </p>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <Button key={link.href} variant="outline" size="sm" asChild>
            <a href={link.href} target="_blank" rel="noopener noreferrer">
              <link.icon className="mr-2 h-4 w-4" /> {t(link.label)}
            </a>
          </Button>
        ))}
      </div>
    </div>
  );
}

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.bookId as string;
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const { t, topic } = useI18n();

  const [book, setBook] = useState<Book | null | undefined>(undefined);
  const [entry, setEntry] = useState<LibraryEntry | null>(null);
  const [ideas, setIdeas] = useState<Post[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getBook(bookId),
      getLibraryEntry(user.uid, bookId),
      getDocs(query(collection(getDb(), 'posts'), where('source.id', '==', bookId), limit(20))).then((s) =>
        s.docs.map(postFromDoc).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      ),
    ])
      .then(([b, e, p]) => {
        if (cancelled) return;
        setBook(b);
        setEntry(e);
        setIdeas(p);
      })
      .catch(() => !cancelled && setBook(null));
    return () => {
      cancelled = true;
    };
  }, [bookId, user.uid]);

  const handleStatusChange = async (next: StatusOption) => {
    if (!book) return;
    setSaving(true);
    try {
      await setReadingStatus(user.uid, book, next);
      setEntry(await getLibraryEntry(user.uid, book.id));
      const label = statusOptions.find((o) => o.value === next)?.label ?? '';
      toast({ title: t('Reading status updated'), description: `${book.title} → ${t(label)}` });
    } catch {
      toast({ title: t('Could not update status'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (book === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  if (book === null) {
    return <div className="text-center py-10"><p className="text-xl text-destructive">{t('Book not found.')}</p></div>;
  }

  const progress = entry?.progress ?? 0;
  const sourceUrl = safeExternalUrl(book.sourceUrl);
  const doiUrl = book.doi ? safeExternalUrl(`https://doi.org/${book.doi}`) : null;
  const editionLabel =
    book.license === 'licensed' ? t('Licensed edition')
    : book.license === 'cc-by' || book.license === 'cc-by-sa' || book.license === 'cc0' ? t('Openly licensed edition')
    : t('Public-domain edition');

  return (
    <div className="max-w-3xl mx-auto w-full py-8 space-y-6">
      <Button variant="outline" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> {t('Back')}
      </Button>

      <Card className="overflow-hidden shadow-lg">
        <div className="md:flex">
          <div className="md:w-1/3 p-4 flex justify-center items-start">
            <BookCover title={book.title} author={book.author} coverUrl={book.coverUrl} className="max-w-[200px] text-xl" />
          </div>
          <div className="md:w-2/3">
            <CardHeader className="p-4 pb-2 md:p-6 md:pb-3">
              <Badge variant="secondary" className="w-fit">{t(KIND_LABELS[book.kind])}</Badge>
              <CardTitle className="text-2xl md:text-3xl font-bold">{book.title}</CardTitle>
              {book.author && <p className="text-md md:text-lg text-muted-foreground">{t('by {author}', { author: book.author })}</p>}
              {book.journal && <p className="text-sm italic text-muted-foreground">{book.journal}</p>}
              {book.publishedYear && <p className="text-sm text-muted-foreground">{t('First published: {year}', { year: book.publishedYear })}</p>}
              {doiUrl && (
                <a href={doiUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">DOI: {book.doi}</a>
              )}
              <div className="pt-2 flex flex-wrap gap-2">
                {book.topics.map((id) => (
                  <Button key={id} variant="outline" size="sm" className="text-xs h-7" asChild>
                    <Link href={`/category/${id}`}>{topic(id)}</Link>
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 md:p-6 md:pt-2 space-y-4">
              <p className="text-sm md:text-base text-foreground/90 leading-relaxed whitespace-pre-line line-clamp-[12]">
                {book.description || t('No description available.')}
              </p>
              {book.readable ? (
                <div className="space-y-2">
                  {entry && progress > 0 && progress < 1 && (
                    <div className="space-y-1">
                      <Progress value={progress * 100} className="h-2" />
                      <p className="text-xs text-muted-foreground">{t('{percent}% read', { percent: Math.round(progress * 100) })}</p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="lg">
                      <Link href={`/read/${book.id}`}>
                        <BookOpen className="mr-2 h-4 w-4" />
                        {progress > 0 && progress < 1 ? t('Continue reading') : progress >= 1 ? t('Read again') : t('Read now')}
                      </Link>
                    </Button>
                    <Button variant="outline" size="lg" asChild>
                      <Link href={`/upload?type=idea&book=${book.id}`}>
                        <PenLine className="mr-2 h-4 w-4" /> {t('Share an idea')}
                      </Link>
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ReflectionDialog
                      book={book}
                      trigger={<Button variant="ghost" size="sm"><MessageSquareQuote className="mr-2 h-4 w-4" />{t('Reflect on it')}</Button>}
                    />
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/notes"><NotebookPen className="mr-2 h-4 w-4" />{t('My notes')}</Link>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {editionLabel}
                    {book.chapterCount ? ` · ${t('{count} sections', { count: book.chapterCount })}` : ''}
                    {book.wordCount ? ` · ${t('about {hours} h read', { hours: Math.max(1, Math.round(book.wordCount / 250 / 60)) })}` : ''}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <WhereToRead book={book} />
                  <Button variant="outline" asChild>
                    <Link href={`/upload?type=idea&book=${book.id}`}>
                      <PenLine className="mr-2 h-4 w-4" /> {t('Share an idea from it')}
                    </Link>
                  </Button>
                </div>
              )}
              {book.attribution && (
                <p className="text-xs text-muted-foreground">
                  {book.attribution}{' '}
                  {sourceUrl && <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{t('Original source')}</a>}
                </p>
              )}
              {entry?.finishedInApp && (
                <p className="text-sm font-medium text-primary flex items-center gap-1.5">
                  <BookOpenCheck className="h-4 w-4" /> {t('You finished this book on Knowledgeable')}
                </p>
              )}
            </CardContent>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t('Reading status')}</CardTitle>
          <CardDescription>{t('Update the status of this book in your reading lists.')}</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={entry?.status ?? 'none'}
            onValueChange={(value) => handleStatusChange(value as StatusOption)}
            className="space-y-2"
            disabled={saving}
          >
            {statusOptions.map(option => (
              <div key={option.value} className="flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/50 transition-colors">
                <RadioGroupItem value={option.value} id={`status-${option.value}`} />
                <Label htmlFor={`status-${option.value}`} className="flex items-center gap-2 cursor-pointer text-sm flex-grow">
                  <option.icon className="h-4 w-4 text-muted-foreground" />
                  {t(option.label)}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">{t('Ideas from this book')}</h2>
        {ideas.length === 0 ? (
          <p className="text-muted-foreground">{t('No one has shared an idea from this book yet.')}</p>
        ) : (
          ideas.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </section>
    </div>
  );
}
