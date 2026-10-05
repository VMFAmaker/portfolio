"use client";

import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, FileText, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PollBlock } from '@/components/posts/PollBlock';
import { useI18n } from '@/contexts/LanguageContext';
import { msg } from '@/lib/i18n/core';
import type { Post } from '@/lib/types';
import { cn } from '@/lib/utils';

export const POST_TYPE_LABELS: Record<Post['type'], string> = {
  idea: msg('Idea'),
  summary: msg('Summary'),
  questions: msg('Discussion questions'),
  opinion: msg('Opinion'),
  article: msg('Article'),
  research: msg('Research'),
  poll: msg('Poll'),
  reel: msg('Reel'),
};

export function SourceLine({ post }: { post: Post }) {
  const { t } = useI18n();
  const source = post.source;
  if (!source) return null;
  const Icon = source.kind === 'book' ? BookOpen : source.kind === 'url' ? Link2 : FileText;
  const href =
    source.kind === 'book' && source.id ? `/book/${source.id}` :
    source.kind === 'post' && source.id ? `/content/${source.id}` :
    source.url;
  return (
    <p className="text-xs text-muted-foreground pt-1 flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{t('From')}</span>
      {href ? (
        source.kind === 'url' ? (
          <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="font-medium hover:underline text-primary truncate">
            {source.title}
          </a>
        ) : (
          <Link href={href} className="font-medium hover:underline text-primary truncate">{source.title}</Link>
        )
      ) : (
        <span className="font-medium truncate">{source.title}</span>
      )}
    </p>
  );
}

/** The content area of a post, shared by the feed card and the detail page. */
export function PostBody({ post, clamp = false }: { post: Post; clamp?: boolean }) {
  return (
    <div className="space-y-4">
      {post.type === 'reel' && post.media?.videoUrl && (
        <div className="mx-auto w-full max-w-sm overflow-hidden rounded-lg bg-black shadow-md">
          <video
            src={post.media.videoUrl}
            controls
            playsInline
            preload="metadata"
            className="aspect-[9/16] w-full object-contain"
          />
        </div>
      )}

      {post.media?.imageUrl && post.type !== 'reel' && (
        <div className="relative w-full h-64 md:h-80 rounded-lg overflow-hidden shadow-md">
          <Image
            src={post.media.imageUrl}
            alt={post.title}
            fill
            style={{ objectFit: 'cover' }}
            sizes="(max-width: 768px) 100vw, 672px"
          />
        </div>
      )}

      {post.type === 'poll' ? (
        <PollBlock post={post} />
      ) : post.type === 'idea' ? (
        <blockquote className="border-l-4 border-primary pl-4 text-lg leading-relaxed whitespace-pre-wrap">
          {post.body}
        </blockquote>
      ) : post.body ? (
        <p className={cn('text-sm leading-relaxed whitespace-pre-wrap', clamp && 'line-clamp-4')}>{post.body}</p>
      ) : null}

      {post.attachment && (
        <Button variant="outline" size="sm" asChild>
          <a href={post.attachment.url} target="_blank" rel="noopener noreferrer">
            <FileText className="mr-2 h-4 w-4" /> {post.attachment.name}
          </a>
        </Button>
      )}
    </div>
  );
}
