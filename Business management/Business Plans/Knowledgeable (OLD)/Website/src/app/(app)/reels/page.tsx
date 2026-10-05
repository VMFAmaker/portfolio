"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import { Bookmark, Clapperboard, Loader2, MessageCircle, ThumbsUp, Volume2, VolumeX } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { usePostActions } from '@/hooks/use-post-actions';
import { listReels } from '@/lib/data/posts';
import { useI18n } from '@/contexts/LanguageContext';
import type { Post } from '@/lib/types';
import { cn } from '@/lib/utils';

function Reel({ post, muted, onToggleMute }: { post: Post; muted: boolean; onToggleMute: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { liked, likeCount, saved, toggleLike, toggleSave } = usePostActions(post);
  const { t, topic } = useI18n();

  // Play only the reel that's on screen.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void video.play().catch(() => undefined);
        else video.pause();
      },
      { threshold: 0.6 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative flex h-[calc(100svh-8rem)] snap-start snap-always items-center justify-center">
      <div className="relative h-full max-h-[calc(100svh-9rem)] aspect-[9/16] overflow-hidden rounded-xl bg-black shadow-lg">
        <video
          ref={videoRef}
          src={post.media?.videoUrl}
          muted={muted}
          loop
          playsInline
          preload="metadata"
          className="h-full w-full object-contain"
          onClick={onToggleMute}
        />
        <button
          type="button"
          onClick={onToggleMute}
          className="absolute right-3 top-3 rounded-full bg-black/50 p-2 text-white"
          aria-label={muted ? t('Unmute') : t('Mute')}
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pr-16 text-white">
          <Link href={`/profile/${post.authorId}`} className="pointer-events-auto flex items-center gap-2">
            <Avatar className="h-8 w-8 border border-white/40">
              <AvatarImage src={post.authorAvatarUrl} alt={post.authorName} />
              <AvatarFallback className="text-black">{post.authorName.substring(0, 1)}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-semibold">{post.authorName}</span>
          </Link>
          <Link href={`/content/${post.id}`} className="pointer-events-auto mt-2 block font-semibold hover:underline">{post.title}</Link>
          {post.body && <p className="mt-1 text-sm text-white/85 line-clamp-2">{post.body}</p>}
          <p className="mt-1 text-xs text-white/70">{post.topics.map((id) => topic(id)).join(' · ')}</p>
        </div>
        <div className="absolute bottom-24 right-2 flex flex-col items-center gap-3 text-white">
          <button type="button" onClick={toggleLike} className="flex flex-col items-center" aria-pressed={liked} aria-label={t('Like')}>
            <span className="rounded-full bg-black/40 p-2.5"><ThumbsUp className={cn('h-5 w-5', liked && 'fill-white')} /></span>
            <span className="text-xs">{likeCount}</span>
          </button>
          <Link href={`/content/${post.id}`} className="rounded-full bg-black/40 p-2.5" aria-label={t('Comments')}>
            <MessageCircle className="h-5 w-5" />
          </Link>
          <button type="button" onClick={toggleSave} className="rounded-full bg-black/40 p-2.5" aria-pressed={saved} aria-label={t('Save')}>
            <Bookmark className={cn('h-5 w-5', saved && 'fill-white')} />
          </button>
        </div>
      </div>
    </section>
  );
}

export default function ReelsPage() {
  const [reels, setReels] = useState<Post[] | null>(null);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [muted, setMuted] = useState(true);
  const { t } = useI18n();
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listReels(null)
      .then((page) => {
        setReels(page.posts);
        setCursor(page.cursor);
      })
      .catch(() => setReels([]));
  }, []);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await listReels(cursor);
      setReels((prev) => [...(prev ?? []), ...page.posts]);
      setCursor(page.cursor);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver(([e]) => e.isIntersecting && void loadMore(), { rootMargin: '800px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore, reels]);

  if (reels === null) {
    return <Loader2 className="mx-auto mt-24 h-12 w-12 animate-spin text-primary" />;
  }
  if (reels.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <Clapperboard className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="text-xl text-muted-foreground">{t('No reels yet.')}</p>
        <p className="text-sm text-muted-foreground">{t('Explain one idea in under 90 seconds and be the first.')}</p>
        <Button asChild><Link href="/upload?type=reel">{t('Post a reel')}</Link></Button>
      </div>
    );
  }

  return (
    <div className="-my-4 sm:-my-6 lg:-my-8 h-[calc(100svh-8rem)] snap-y snap-mandatory overflow-y-auto">
      {reels.map((post) => (
        <Reel key={post.id} post={post} muted={muted} onToggleMute={() => setMuted((m) => !m)} />
      ))}
      <div ref={sentinel} className="h-1" />
      {loadingMore && <Loader2 className="mx-auto my-6 h-8 w-8 animate-spin text-primary" />}
    </div>
  );
}
