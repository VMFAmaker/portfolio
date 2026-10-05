import Image from 'next/image';
import { cn } from '@/lib/utils';

// Muted, palette-friendly cover colours; the same book always gets the same one.
const COVER_TONES = [
  'from-sky-200 to-sky-400 text-sky-950',
  'from-indigo-200 to-indigo-400 text-indigo-950',
  'from-slate-200 to-slate-400 text-slate-900',
  'from-teal-200 to-teal-400 text-teal-950',
  'from-amber-100 to-amber-300 text-amber-950',
  'from-blue-300 to-blue-500 text-blue-950',
  'from-cyan-100 to-cyan-300 text-cyan-950',
];

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

interface BookCoverProps {
  title: string;
  author: string;
  coverUrl?: string;
  className?: string;
  sizes?: string;
}

/** Real cover when we have one; otherwise a typographic cover in the app's palette. */
export function BookCover({ title, author, coverUrl, className, sizes = '200px' }: BookCoverProps) {
  return (
    <div className={cn('relative aspect-[2/3] w-full overflow-hidden rounded-md shadow-md', className)}>
      {coverUrl ? (
        <Image
          src={coverUrl}
          alt={title}
          fill
          sizes={sizes}
          style={{ objectFit: 'cover' }}
          // Open Library covers redirect to the Internet Archive, so they're loaded directly.
          unoptimized={!coverUrl.startsWith('https://firebasestorage.googleapis.com/')}
        />
      ) : (
        <div
          className={cn(
            'flex h-full w-full flex-col justify-between bg-gradient-to-br p-3',
            COVER_TONES[hash(title) % COVER_TONES.length]
          )}
          role="img"
          aria-label={`${title} by ${author}`}
        >
          <span className="font-bodoni text-[0.95em] font-bold leading-tight line-clamp-5">{title}</span>
          <span className="text-[0.7em] font-medium uppercase tracking-wide opacity-80 line-clamp-2">{author}</span>
        </div>
      )}
    </div>
  );
}
