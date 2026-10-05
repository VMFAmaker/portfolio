"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Bookmark as BookmarkIcon, BookmarkCheck, ChevronLeft, ChevronRight, Highlighter, List, Loader2, Minus,
  NotebookPen, PartyPopper, Plus, StickyNote, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/LanguageContext';
import { getBook, getChapter, listChapterTitles } from '@/lib/data/books';
import { getLibraryEntry, saveReadingProgress } from '@/lib/data/library';
import {
  addAnnotation, addBookmark, bookmarkId, deleteAnnotation, deleteBookmark, subscribeAnnotations, subscribeBookmarks, updateAnnotation,
} from '@/lib/data/notes';
import { importToLibrary } from '@/lib/data/discover';
import { segmentParagraph } from '@/lib/text/highlights';
import { AnnotationEditor } from '@/components/reader/AnnotationEditor';
import { ReflectionDialog } from '@/components/reader/ReflectionDialog';
import { HIGHLIGHT_COLOURS, highlightClass } from '@/components/reader/highlight-colours';
import { readSelection, type TextSelection } from '@/components/reader/selection';
import type { Annotation, Book, Bookmark, Chapter, HighlightColour, LibraryEntry } from '@/lib/types';
import { cn } from '@/lib/utils';

const TEXT_SIZES = ['text-base', 'text-lg', 'text-xl', 'text-2xl'] as const;
const TEXT_SIZE_KEY = 'reader:textSize';
const SAVE_DEBOUNCE_MS = 2500;
/** Height of the sticky app header; a paragraph below this line counts as "where you are". */
const HEADER_OFFSET = 80;

function readStoredTextSize(): number {
  try {
    const stored = Number(localStorage.getItem(TEXT_SIZE_KEY));
    return Number.isInteger(stored) && stored >= 0 && stored < TEXT_SIZES.length ? stored : 1;
  } catch {
    return 1;
  }
}

/** How far through the chapter article the reader has scrolled, 0–1. */
function measureScrollProgress(article: HTMLElement | null): number {
  if (!article) return 0;
  const rect = article.getBoundingClientRect();
  const scrollable = rect.height - window.innerHeight;
  if (scrollable <= 0) return 1;
  return Math.min(Math.max(-rect.top / scrollable, 0), 1);
}

/** The first paragraph whose bottom is below the header — i.e. the one being read. */
function currentParagraphIndex(article: HTMLElement | null): number {
  if (!article) return 0;
  for (const p of article.querySelectorAll<HTMLElement>('[data-paragraph]')) {
    if (p.getBoundingClientRect().bottom > HEADER_OFFSET) return Number(p.dataset.paragraph);
  }
  return 0;
}

function paramInt(value: string | null): number | null {
  if (value === null || value === '') return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

type Target = { paragraph: number; annotationId?: string };

export default function ReaderPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookId = params.bookId as string;
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { t } = useI18n();

  const [book, setBook] = useState<Book | null | undefined>(undefined);
  const [preparing, setPreparing] = useState(false);
  const [toc, setToc] = useState<Array<{ index: number; title: string }>>([]);
  const [chapterIndex, setChapterIndex] = useState<number | null>(null);
  const [chapter, setChapter] = useState<Chapter | null | undefined>(undefined);
  const [chapterProgress, setChapterProgress] = useState(0);
  const [currentParagraph, setCurrentParagraph] = useState(0);
  const [textSize, setTextSize] = useState(1);
  const [justFinished, setJustFinished] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [selection, setSelection] = useState<TextSelection | null>(null);
  const [editor, setEditor] = useState<{ annotation?: Annotation; pending?: TextSelection } | null>(null);

  const entryRef = useRef<LibraryEntry | null>(null);
  const articleRef = useRef<HTMLElement>(null);
  const resumeAt = useRef<number | null>(null);
  const target = useRef<Target | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef<string>('');

  useEffect(() => setTextSize(readStoredTextSize()), []);

  // Load the book, its contents, and where the reader left off (or the place a link points to).
  useEffect(() => {
    let cancelled = false;
    Promise.all([getBook(bookId), getLibraryEntry(user.uid, bookId), listChapterTitles(bookId)])
      .then(async ([b, entry, titles]) => {
        if (cancelled) return;
        // A public-domain scan whose text isn't in our library yet: import it once, then read it here.
        if (b && b.archiveId && b.openLibraryId && titles.length === 0) {
          setPreparing(true);
          try {
            await importToLibrary({ source: 'openlibrary', workId: b.openLibraryId });
            [b, titles] = await Promise.all([getBook(bookId), listChapterTitles(bookId)]);
          } catch {
            // Falls through to "not available".
          }
          if (cancelled) return;
          setPreparing(false);
        }
        if (!b || !b.readable || titles.length === 0) {
          setBook(b ? { ...b, readable: false } : null);
          return;
        }
        entryRef.current = entry;
        setBook(b);
        setToc(titles);
        const count = b.chapterCount ?? titles.length;
        const requested = paramInt(searchParams.get('chapter'));
        const paragraph = paramInt(searchParams.get('p'));
        let start: number;
        if (requested !== null && requested < count) {
          start = requested;
          if (paragraph !== null) target.current = { paragraph, annotationId: searchParams.get('a') ?? undefined };
        } else {
          start = entry?.status === 'finished' && entry.progress >= 1 ? 0 : entry?.chapterIndex ?? 0;
          if (entry && start === entry.chapterIndex && entry.progress < 1) resumeAt.current = entry.chapterProgress;
        }
        setChapterIndex(start);
      })
      .catch(() => !cancelled && setBook(null));
    return () => {
      cancelled = true;
    };
    // Link parameters are only honoured on first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, user.uid]);

  useEffect(() => subscribeAnnotations(user.uid, bookId, setAnnotations), [user.uid, bookId]);
  useEffect(() => subscribeBookmarks(user.uid, bookId, setBookmarks), [user.uid, bookId]);

  useEffect(() => {
    if (chapterIndex === null) return;
    let cancelled = false;
    setChapter(undefined);
    setSelection(null);
    getChapter(bookId, chapterIndex)
      .then((c) => !cancelled && setChapter(c))
      .catch(() => !cancelled && setChapter(null));
    return () => {
      cancelled = true;
    };
  }, [bookId, chapterIndex]);

  const persist = useCallback(
    async (index: number, fraction: number) => {
      if (!book) return;
      const key = `${index}:${fraction.toFixed(2)}`;
      if (key === lastSaved.current) return;
      lastSaved.current = key;
      try {
        const previousStatus = entryRef.current?.status;
        const status = await saveReadingProgress(user.uid, book, index, fraction, entryRef.current);
        entryRef.current = await getLibraryEntry(user.uid, book.id);
        if (status === 'finished' && previousStatus !== 'finished') setJustFinished(true);
      } catch (error) {
        console.warn('Could not save reading progress', error);
        lastSaved.current = '';
      }
    },
    [book, user.uid]
  );

  const scrollToParagraph = useCallback((paragraph: number, flash: boolean) => {
    const el = articleRef.current?.querySelector<HTMLElement>(`[data-paragraph="${paragraph}"]`);
    if (!el) return;
    el.scrollIntoView({ block: 'center' });
    if (flash) {
      el.classList.add('reader-flash');
      setTimeout(() => el.classList.remove('reader-flash'), 2200);
    }
  }, []);

  // Restore the position once the chapter is rendered, then track progress as the user reads.
  useEffect(() => {
    if (!chapter || chapterIndex === null) return;
    const article = articleRef.current;
    const resume = resumeAt.current;
    const jump = target.current;
    resumeAt.current = null;
    target.current = null;

    // Next.js may scroll to the top after navigation, so the restore is re-applied a few times and
    // scroll events are ignored until it has settled — otherwise the saved position would reset to 0.
    const applyScroll = () => {
      if (!article?.isConnected) return;
      if (jump) {
        scrollToParagraph(jump.paragraph, false);
        return;
      }
      const articleTop = article.getBoundingClientRect().top + window.scrollY;
      const position = resume === null ? 0 : articleTop + resume * Math.max(article.offsetHeight - window.innerHeight, 0);
      window.scrollTo({ top: position });
    };
    const restoreUntil = Date.now() + 700;
    applyScroll();
    const frame = requestAnimationFrame(applyScroll);
    const timers = [setTimeout(applyScroll, 150), setTimeout(() => {
      applyScroll();
      if (jump) scrollToParagraph(jump.paragraph, true);
    }, 500)];
    // The last position actually measured while the chapter was on screen. Saved on exit instead
    // of re-measuring, because by then the article may already be detached from the page.
    let lastFraction = resume ?? 0;
    setChapterProgress(lastFraction);

    const onScroll = () => {
      if (Date.now() < restoreUntil || !article?.isConnected) return;
      lastFraction = measureScrollProgress(article);
      setChapterProgress(lastFraction);
      setCurrentParagraph(currentParagraphIndex(article));
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => void persist(chapterIndex, lastFraction), SAVE_DEBOUNCE_MS);
    };
    const flush = () => {
      if (document.visibilityState === 'hidden') void persist(chapterIndex, lastFraction);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', flush);
    return () => {
      cancelAnimationFrame(frame);
      timers.forEach(clearTimeout);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', flush);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      void persist(chapterIndex, lastFraction);
    };
  }, [chapter, chapterIndex, persist, scrollToParagraph]);

  // Show the highlight toolbar whenever text is selected inside the chapter.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setSelection(readSelection(articleRef.current)), 120);
    };
    document.addEventListener('selectionchange', update);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('selectionchange', update);
    };
  }, []);

  useEffect(() => {
    if (justFinished && book) {
      toast({ title: t('You finished {title}!', { title: book.title }), description: t('It now shows as finished on your profile.') });
    }
  }, [justFinished, book, toast, t]);

  const paragraphs = useMemo(() => (chapter?.body ?? '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean), [chapter]);
  const chapterAnnotations = useMemo(() => annotations.filter((a) => a.chapterIndex === chapterIndex), [annotations, chapterIndex]);

  const changeTextSize = (delta: number) => {
    setTextSize((current) => {
      const next = Math.min(Math.max(current + delta, 0), TEXT_SIZES.length - 1);
      try {
        localStorage.setItem(TEXT_SIZE_KEY, String(next));
      } catch {
        // Private mode — the size just won't be remembered.
      }
      return next;
    });
  };

  const goTo = (index: number, paragraph?: number, annotationId?: string) => {
    setJustFinished(false);
    if (index === chapterIndex && paragraph !== undefined) {
      scrollToParagraph(paragraph, true);
      return;
    }
    if (paragraph !== undefined) target.current = { paragraph, annotationId };
    setChapterIndex(index);
  };

  const highlight = async (colour: HighlightColour, note?: string, pending = selection) => {
    if (!book || chapterIndex === null || !pending) return;
    try {
      await addAnnotation(user.uid, {
        bookId: book.id,
        bookTitle: book.title,
        chapterIndex,
        paragraphIndex: pending.paragraphIndex,
        start: pending.start,
        end: pending.end,
        quote: pending.quote,
        note,
        colour,
      });
      window.getSelection()?.removeAllRanges();
      setSelection(null);
    } catch {
      toast({ title: t('Could not save the highlight'), variant: 'destructive' });
    }
  };

  const currentBookmark = chapterIndex === null ? undefined
    : bookmarks.find((b) => b.id === bookmarkId(bookId, chapterIndex, currentParagraph));

  const toggleBookmark = async () => {
    if (!book || chapterIndex === null) return;
    try {
      if (currentBookmark) {
        await deleteBookmark(user.uid, currentBookmark.id);
        toast({ title: t('Bookmark removed') });
      } else {
        await addBookmark(user.uid, {
          bookId: book.id,
          bookTitle: book.title,
          chapterIndex,
          paragraphIndex: currentParagraph,
          chapterTitle: chapter?.title ?? '',
          snippet: paragraphs[currentParagraph]?.slice(0, 200) ?? '',
        });
        toast({ title: t('Bookmarked'), description: t('Find it under the bookmarks in the contents panel.') });
      }
    } catch {
      toast({ title: t('Could not update the bookmark'), variant: 'destructive' });
    }
  };

  if (preparing) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 min-h-[60vh] text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">{t('Preparing this book for reading — this only happens once.')}</p>
      </div>
    );
  }
  if (book === undefined || (book && book.readable && chapterIndex === null)) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  if (book === null || !book.readable) {
    return (
      <div className="text-center py-10 space-y-4">
        <p className="text-xl text-muted-foreground">{t("This book isn't available to read in the app.")}</p>
        <Button variant="outline" onClick={() => router.back()}>{t('Go back')}</Button>
      </div>
    );
  }

  const chapterCount = book.chapterCount ?? toc.length;
  const overall = chapterCount ? ((chapterIndex ?? 0) + chapterProgress) / chapterCount : 0;
  const isLast = (chapterIndex ?? 0) >= chapterCount - 1;
  const chapterTitleOf = (index: number) => toc.find((c) => c.index === index)?.title ?? '';

  const toolbarStyle = selection
    ? {
        top: selection.rect.top - 52 < 72 ? selection.rect.bottom + 8 : selection.rect.top - 52,
        left: Math.min(Math.max(selection.rect.left + selection.rect.width / 2 - 120, 8), window.innerWidth - 248),
      }
    : undefined;

  return (
    <div className="max-w-2xl mx-auto w-full pb-24">
      {/* Fixed (not sticky): the app's <main> clips overflow, which disables sticky positioning. */}
      <div className="fixed inset-x-0 top-0 z-50 h-1 bg-transparent" aria-hidden="true">
        <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${Math.min(overall, 1) * 100}%` }} />
      </div>
      <div className="mb-6 border-b pb-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild aria-label={t('Back to book')}>
            <Link href={`/book/${book.id}`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{book.title}</p>
            <p className="truncate text-xs text-muted-foreground">{chapter?.title ?? ' '}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleBookmark} aria-pressed={Boolean(currentBookmark)} aria-label={currentBookmark ? t('Remove bookmark') : t('Bookmark this page')}>
            {currentBookmark ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <BookmarkIcon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => changeTextSize(-1)} disabled={textSize === 0} aria-label={t('Smaller text')}>
            <Minus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => changeTextSize(1)} disabled={textSize === TEXT_SIZES.length - 1} aria-label={t('Larger text')}>
            <Plus className="h-4 w-4" />
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t('Contents, bookmarks and notes')}><List className="h-4 w-4" /></Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
              <SheetHeader>
                <SheetTitle className="truncate">{book.title}</SheetTitle>
              </SheetHeader>
              <Tabs defaultValue="contents" className="mt-4 flex min-h-0 flex-1 flex-col">
                <TabsList className="grid grid-cols-3">
                  <TabsTrigger value="contents">{t('Contents')}</TabsTrigger>
                  <TabsTrigger value="bookmarks">{t('Bookmarks')} {bookmarks.length > 0 && `(${bookmarks.length})`}</TabsTrigger>
                  <TabsTrigger value="notes">{t('Notes')} {annotations.length > 0 && `(${annotations.length})`}</TabsTrigger>
                </TabsList>
                <TabsContent value="contents" className="min-h-0 flex-1 overflow-y-auto">
                  <ol className="space-y-1">
                    {toc.map((item) => (
                      <li key={item.index}>
                        <SheetClose asChild>
                          <button
                            type="button"
                            onClick={() => goTo(item.index)}
                            className={cn('w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted', item.index === chapterIndex && 'bg-muted font-semibold')}
                          >
                            {item.title}
                          </button>
                        </SheetClose>
                      </li>
                    ))}
                  </ol>
                </TabsContent>
                <TabsContent value="bookmarks" className="min-h-0 flex-1 overflow-y-auto">
                  {bookmarks.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">{t('No bookmarks yet. Tap the bookmark icon to save the page you are on.')}</p>
                  ) : (
                    <ul className="space-y-2">
                      {bookmarks.map((b) => (
                        <li key={b.id} className="flex items-start gap-1 rounded-md border">
                          <SheetClose asChild>
                            <button type="button" onClick={() => goTo(b.chapterIndex, b.paragraphIndex)} className="min-w-0 flex-1 p-3 text-left hover:bg-muted">
                              <p className="text-xs font-semibold text-muted-foreground">{b.chapterTitle || chapterTitleOf(b.chapterIndex)}</p>
                              <p className="text-sm line-clamp-2">{b.snippet}</p>
                            </button>
                          </SheetClose>
                          <Button variant="ghost" size="icon" className="m-1 h-8 w-8 shrink-0" aria-label={t('Remove bookmark')} onClick={() => void deleteBookmark(user.uid, b.id)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </TabsContent>
                <TabsContent value="notes" className="min-h-0 flex-1 overflow-y-auto">
                  {annotations.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">{t('Select any text to highlight it or add a note.')}</p>
                  ) : (
                    <ul className="space-y-2">
                      {annotations.map((a) => (
                        <li key={a.id}>
                          <SheetClose asChild>
                            <button type="button" onClick={() => goTo(a.chapterIndex, a.paragraphIndex, a.id)} className="w-full rounded-md border p-3 text-left hover:bg-muted">
                              <p className="text-xs font-semibold text-muted-foreground">{chapterTitleOf(a.chapterIndex)}</p>
                              <p className={cn('mt-1 rounded px-1 font-serif text-sm line-clamp-3', highlightClass(a.colour))}>{a.quote}</p>
                              {a.note && <p className="mt-1 text-sm flex gap-1.5"><StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0" />{a.note}</p>}
                            </button>
                          </SheetClose>
                        </li>
                      ))}
                    </ul>
                  )}
                </TabsContent>
              </Tabs>
            </SheetContent>
          </Sheet>
        </div>
        <Progress value={Math.min(overall, 1) * 100} className="mt-2 h-1" aria-label={t('Progress through the book')} />
      </div>

      {chapter === undefined ? (
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
      ) : chapter === null ? (
        <p className="text-center text-muted-foreground">{t("This section couldn't be loaded.")}</p>
      ) : (
        <article ref={articleRef} className={cn('font-serif leading-relaxed', TEXT_SIZES[textSize])}>
          <h1 className="font-bodoni text-3xl font-bold mb-8">{chapter.title}</h1>
          {paragraphs.map((paragraph, i) => {
            const inParagraph = chapterAnnotations.filter((a) => a.paragraphIndex === i);
            const segments = segmentParagraph(paragraph, inParagraph.map((a) => ({ id: a.id, start: a.start, end: a.end, colour: a.colour })));
            return (
              <p key={i} data-paragraph={i} className="mb-5 whitespace-pre-line rounded transition-colors">
                {segments.map((segment) => {
                  if (!segment.annotationId) return segment.text;
                  const annotation = inParagraph.find((a) => a.id === segment.annotationId);
                  return (
                    <mark
                      key={`${segment.annotationId}-${segment.start}`}
                      className={cn('cursor-pointer rounded-sm text-inherit', highlightClass(segment.colour ?? 'yellow'), annotation?.note && 'underline decoration-dotted underline-offset-4')}
                      onClick={() => annotation && setEditor({ annotation })}
                      title={annotation?.note}
                    >
                      {segment.text}
                    </mark>
                  );
                })}
              </p>
            );
          })}
        </article>
      )}

      {/* Floating toolbar for the current text selection. */}
      {selection && toolbarStyle && (
        <div
          className="fixed z-50 flex items-center gap-1 rounded-full border bg-popover p-1.5 shadow-lg"
          style={toolbarStyle}
          role="toolbar"
          aria-label={t('Highlight')}
          onMouseDown={(e) => e.preventDefault()}
        >
          <Highlighter className="mx-1 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          {HIGHLIGHT_COLOURS.map((c) => (
            <button
              key={c.value}
              type="button"
              aria-label={t('Highlight in {colour}', { colour: t(c.label) })}
              className={cn('h-7 w-7 rounded-full border border-black/10', c.swatch)}
              onClick={() => void highlight(c.value)}
            />
          ))}
          <Button size="sm" variant="ghost" className="h-8 rounded-full" onClick={() => setEditor({ pending: selection })}>
            <NotebookPen className="mr-1 h-4 w-4" /> {t('Note')}
          </Button>
        </div>
      )}

      <AnnotationEditor
        open={editor !== null}
        onOpenChange={(open) => !open && setEditor(null)}
        quote={editor?.annotation?.quote ?? editor?.pending?.quote ?? ''}
        initialNote={editor?.annotation?.note ?? ''}
        initialColour={editor?.annotation?.colour ?? 'yellow'}
        onDelete={editor?.annotation ? async () => deleteAnnotation(user.uid, editor.annotation!.id) : undefined}
        onSave={async (note, colour) => {
          if (editor?.annotation) await updateAnnotation(user.uid, editor.annotation.id, { note, colour });
          else if (editor?.pending) await highlight(colour, note, editor.pending);
        }}
      />

      {justFinished && (
        <div className="mt-10 rounded-xl border bg-card p-6 text-center space-y-3">
          <PartyPopper className="mx-auto h-8 w-8 text-primary" />
          <p className="text-lg font-semibold">{t('You finished {title}!', { title: book.title })}</p>
          <p className="text-sm text-muted-foreground">{t('Take two minutes to reflect: putting it into your own words is what makes it stick.')}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <ReflectionDialog book={book} defaultOpen trigger={<Button>{t('Reflect on it')}</Button>} />
            <Button variant="outline" asChild><Link href={`/upload?type=idea&book=${book.id}`}>{t('Share an idea')}</Link></Button>
          </div>
        </div>
      )}

      <div className="mt-10 flex items-center justify-between gap-2 border-t pt-6">
        <Button variant="outline" onClick={() => goTo((chapterIndex ?? 0) - 1)} disabled={(chapterIndex ?? 0) === 0}>
          <ChevronLeft className="mr-1 h-4 w-4" /> {t('Previous')}
        </Button>
        <span className="text-xs text-muted-foreground">{(chapterIndex ?? 0) + 1} / {chapterCount}</span>
        <Button onClick={() => goTo((chapterIndex ?? 0) + 1)} disabled={isLast}>
          {t('Next')} <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
