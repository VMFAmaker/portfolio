"use client";

import { Card, CardContent } from '@/components/ui/card';
import { BookCover } from '@/components/books/BookCover';
import { ImportButton } from '@/components/library/ImportButton';
import { useI18n } from '@/contexts/LanguageContext';
import type { ExternalBook } from '@/lib/data/discover';

/** An Open Library result. Opening it adds it to our catalogue; public-domain scans get their full text imported. */
export function ExternalBookTile({ book }: { book: ExternalBook }) {
  const { t } = useI18n();
  return (
    <Card className="overflow-hidden h-full flex flex-col">
      <div className="p-2 pb-0">
        <BookCover title={book.title} author={book.author} coverUrl={book.coverUrl} className="text-base" sizes="200px" />
      </div>
      <CardContent className="p-3 flex-grow flex flex-col justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold line-clamp-2">{book.title}</h3>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {book.author}{book.firstPublished ? ` · ${book.firstPublished}` : ''}
          </p>
          {book.archiveId && <p className="text-[11px] font-medium text-primary mt-1">{t('Read free in the app')}</p>}
        </div>
        <ImportButton
          request={{ source: 'openlibrary', workId: book.workId }}
          label={t('Open')}
          size="sm"
          variant="outline"
          className="w-full"
        />
      </CardContent>
    </Card>
  );
}
