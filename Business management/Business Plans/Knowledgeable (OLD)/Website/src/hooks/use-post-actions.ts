"use client";

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/contexts/AuthContext';
import { hasLiked, isSaved, savePost, setLiked, unsavePost } from '@/lib/data/posts';
import type { Post } from '@/lib/types';
import { useI18n } from '@/contexts/LanguageContext';
import { notify } from '@/lib/data/notifications';

/** Like / save / share state for a post, with optimistic updates that roll back on failure. */
export function usePostActions(post: Post) {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { t } = useI18n();
  const [liked, setLikedState] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [saved, setSavedState] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([hasLiked(post.id, user.uid), isSaved(user.uid, post.id)])
      .then(([l, s]) => {
        if (cancelled) return;
        setLikedState(l);
        setSavedState(s);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [post.id, user.uid]);

  const toggleLike = async () => {
    if (busy) return;
    const next = !liked;
    setBusy(true);
    setLikedState(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    try {
      await setLiked(post.id, user.uid, next);
      if (next) notify({ type: 'like', postId: post.id });
    } catch {
      setLikedState(!next);
      setLikeCount((c) => c - (next ? 1 : -1));
      toast({ title: t('Could not update like'), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const toggleSave = async () => {
    const next = !saved;
    setSavedState(next);
    try {
      if (next) await savePost(user.uid, post);
      else await unsavePost(user.uid, post.id);
      toast({
        title: next ? t('Saved to your stash') : t('Removed from your stash'),
        description: next ? t("We'll bring it back in your feed so it sticks.") : undefined,
      });
    } catch {
      setSavedState(!next);
      toast({ title: t('Could not update saved items'), variant: 'destructive' });
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/content/${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: post.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: t('Link copied'), description: t('Share it with a fellow reader.') });
      }
    } catch {
      // User cancelled the share sheet.
    }
  };

  return { liked, likeCount, saved, toggleLike, toggleSave, share };
}
