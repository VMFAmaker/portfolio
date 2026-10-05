"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import { Loader2, Sparkles } from 'lucide-react';
import { PostCard } from '@/components/posts/PostCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCurrentUser } from '@/contexts/AuthContext';
import { loadFollowingFeed, loadForYouFeed, type FeedItem } from '@/lib/data/posts';
import { listFollowingIds } from '@/lib/data/profiles';
import { useI18n } from '@/contexts/LanguageContext';

type FeedTab = 'for-you' | 'following';

export default function ContentFeedPage() {
  const { user, profile } = useCurrentUser();
  const { t } = useI18n();
  const [tab, setTab] = useState<FeedTab>('for-you');
  const [items, setItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot | null>(null);
  const [status, setStatus] = useState<'loading' | 'idle' | 'loading-more' | 'error'>('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const followingIds = useRef<string[] | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const interestsKey = profile.interests.join(',');

  const loadPage = useCallback(
    async (after: QueryDocumentSnapshot | null) => {
      if (tab === 'following') {
        followingIds.current ??= await listFollowingIds(user.uid);
        return loadFollowingFeed(followingIds.current, after);
      }
      return loadForYouFeed(user.uid, profile.interests, after);
    },
    // interestsKey captures interest changes without re-running on every profile snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tab, user.uid, interestsKey]
  );

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setItems([]);
    loadPage(null)
      .then((page) => {
        if (cancelled) return;
        setItems(page.items);
        setCursor(page.cursor);
        setStatus('idle');
      })
      .catch(() => !cancelled && setStatus('error'));
    return () => {
      cancelled = true;
    };
  }, [loadPage, reloadKey]);

  const loadMore = useCallback(async () => {
    if (!cursor || status !== 'idle') return;
    setStatus('loading-more');
    try {
      const page = await loadPage(cursor);
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.post.id));
        return [...prev, ...page.items.filter((i) => !seen.has(i.post.id))];
      });
      setCursor(page.cursor);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }, [cursor, status, loadPage]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => entries[0]?.isIntersecting && void loadMore(), { rootMargin: '600px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="space-y-6 pb-10">
      <Tabs value={tab} onValueChange={(v) => setTab(v as FeedTab)} className="w-full max-w-2xl mx-auto">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="for-you">{t('For you')}</TabsTrigger>
          <TabsTrigger value="following">{t('Following')}</TabsTrigger>
        </TabsList>
      </Tabs>

      {status === 'loading' ? (
        <div className="flex flex-col justify-center items-center min-h-[calc(100vh-16rem)]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg mt-4">{t('Loading feed…')}</p>
        </div>
      ) : items.length === 0 && status !== 'error' ? (
        <div className="text-center py-10 space-y-3">
          {tab === 'following' ? (
            <>
              <p className="text-xl text-muted-foreground">{t('Posts from people you follow will appear here.')}</p>
              <p className="text-sm text-muted-foreground">{t('Find readers through search or on posts in your feed.')}</p>
            </>
          ) : (
            <>
              <p className="text-xl text-muted-foreground">{t('No posts in your topics yet.')}</p>
              <p className="text-sm text-muted-foreground">{t('Be the first to share an idea, or widen your interests.')}</p>
              <div className="flex justify-center gap-2 pt-2">
                <Button asChild><Link href="/upload">{t('Share an idea')}</Link></Button>
                <Button asChild variant="outline"><Link href="/personalize"><Sparkles className="mr-2 h-4 w-4" />{t('Personalise feed')}</Link></Button>
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          {items.map((item) => (
            <PostCard key={`${item.reason}-${item.post.id}`} post={item.post} reason={item.reason} />
          ))}
          <div ref={sentinel} />
          {status === 'loading-more' && <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />}
          {status === 'error' && (
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">{t("Couldn't load more posts.")}</p>
              <Button variant="outline" onClick={() => (items.length ? setStatus('idle') : setReloadKey((k) => k + 1))}>
                {t('Try again')}
              </Button>
            </div>
          )}
          {!cursor && status === 'idle' && items.length > 0 && (
            <p className="text-center text-sm text-muted-foreground">{t("You're all caught up.")}</p>
          )}
        </>
      )}
    </div>
  );
}
