"use client";

import Link from 'next/link';
import { BookOpenCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BookCover } from '@/components/books/BookCover';
import { useI18n } from '@/contexts/LanguageContext';
import { KIND_LABELS } from '@/components/library/kind-labels';
import type { WorkKind } from '@/lib/types';

interface BookTileProps {
  bookId: string;
  title: string;
  author: string;
  coverUrl?: string;
  /** 0–1; shows a progress bar when provided. */
  progress?: number;
  readable?: boolean;
  finishedInApp?: boolean;
  /** Shows a small label for papers and articles. */
  kind?: WorkKind;
}

export function BookTile({ bookId, title, author, coverUrl, progress, readable, finishedInApp, kind }: BookTileProps) {
  const { t } = useI18n();
  return (
    <Link href={`/book/${bookId}`} className="block h-full group cursor-pointer">
      <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
        <div className="p-2 pb-0">
          <BookCover
            title={title}
            author={author}
            coverUrl={coverUrl}
            className="group-hover:scale-[1.02] transition-transform duration-300 text-base"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
          />
        </div>
        <CardContent className="p-3 flex-grow flex flex-col justify-between gap-2">
          <div>
            {kind && kind !== 'book' && (
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t(KIND_LABELS[kind])}</p>
            )}
            <h3 className="text-sm font-semibold line-clamp-2 group-hover:text-primary">{title}</h3>
            <p className="text-xs text-muted-foreground line-clamp-1">{author}</p>
          </div>
          {progress !== undefined && progress < 1 && (
            <div className="space-y-1">
              <Progress value={progress * 100} className="h-1.5" />
              <p className="text-[11px] text-muted-foreground">{t('{percent}% read', { percent: Math.round(progress * 100) })}</p>
            </div>
          )}
          {finishedInApp && (
            <p className="text-[11px] font-medium text-primary flex items-center gap-1">
              <BookOpenCheck className="h-3.5 w-3.5" /> {t('Finished on Knowledgeable')}
            </p>
          )}
          {readable && progress === undefined && (
            <p className="text-[11px] font-medium text-primary">{t('Read free in the app')}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
