"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Bookmark, BrainCircuit, MessageCircle, Share2, Shuffle, ThumbsUp } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePostActions } from '@/hooks/use-post-actions';
import { useCurrentUser } from '@/contexts/AuthContext';
import { recordReview, type FeedReason } from '@/lib/data/posts';
import { PostBody, POST_TYPE_LABELS, SourceLine } from '@/components/posts/PostBody';
import { CommentThread } from '@/components/posts/CommentThread';
import { useI18n } from '@/contexts/LanguageContext';
import { useSafety } from '@/contexts/SafetyContext';
import { SafetyMenu } from '@/components/safety/SafetyMenu';
import type { Post } from '@/lib/types';
import { cn } from "@/lib/utils";

interface PostCardProps {
  post: Post;
  reason?: FeedReason;
}

function RevisitPrompt({ post }: { post: Post }) {
  const { user } = useCurrentUser();
  const { t } = useI18n();
  const [answered, setAnswered] = useState<null | boolean>(null);
  const answer = async (remembered: boolean) => {
    setAnswered(remembered);
    await recordReview(user.uid, post.id, remembered).catch(() => setAnswered(null));
  };
  return (
    <div className="mx-4 mb-2 rounded-lg bg-muted/60 p-3 text-sm">
      {answered === null ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2 font-medium">
            <BrainCircuit className="h-4 w-4 text-primary" /> {t('Do you still remember this one?')}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => answer(false)}>{t('Show me again')}</Button>
            <Button size="sm" onClick={() => answer(true)}>{t('Got it')}</Button>
          </div>
        </div>
      ) : (
        <span className="text-muted-foreground">
          {answered ? t("Nice — we'll check back in a while.") : t("No problem — it'll come back tomorrow.")}
        </span>
      )}
    </div>
  );
}

export function PostCard({ post, reason }: PostCardProps) {
  const isMobile = useIsMobile();
  const { liked, likeCount, saved, toggleLike, toggleSave, share } = usePostActions(post);
  const { t, topic, relative } = useI18n();
  const { isBlocked } = useSafety();

  // Posts from people you've blocked disappear everywhere.
  if (isBlocked(post.authorId)) return null;

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg rounded-xl overflow-hidden">
      {reason === 'revisit' && (
        <p className="px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-primary">{t('From your stash')}</p>
      )}
      {reason === 'adjacent' && (
        <p className="px-4 pt-3 text-xs text-muted-foreground flex items-center gap-1.5">
          <Shuffle className="h-3.5 w-3.5" /> {t('Related to what you follow')}
        </p>
      )}
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">
              {t(POST_TYPE_LABELS[post.type])}
            </p>
            <CardTitle className="text-xl mb-0">
              <Link href={`/content/${post.id}`} className="hover:underline">
                {post.title}
              </Link>
            </CardTitle>
          </div>
          {post.topics.length > 0 && (
            <div className="ml-2 pl-2 shrink-0 flex gap-1 flex-col items-end sm:flex-row sm:flex-wrap sm:items-center">
              {post.topics.slice(0, 2).map((id) => ({ id, topicName: topic(id) })).map(({ id, topicName }) => (
                <Link key={id} href={`/category/${id}`}>
                  <Badge variant="outline" className="px-1.5 py-0.5 text-[10px] font-medium hover:bg-muted/50 cursor-pointer leading-tight">
                    {topicName}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
          <SafetyMenu
            className="-mr-2 -mt-1 ml-1 shrink-0 text-muted-foreground"
            target={{ type: 'post', id: post.id, userId: post.authorId, userName: post.authorName, context: post.title }}
          />
        </div>

        <div className="flex items-center space-x-3 pt-2">
          <Avatar className="h-10 w-10">
            <AvatarImage src={post.authorAvatarUrl} alt={post.authorName} />
            <AvatarFallback>{post.authorName.substring(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <Link href={`/profile/${post.authorId}`} className="font-semibold text-sm hover:underline">
              {post.authorName}
            </Link>
            <p className="text-xs text-muted-foreground">
              {post.authors?.length ? `${post.authors.join(', ')} · ` : ''}
              {relative(post.createdAt)}
            </p>
          </div>
        </div>
        <SourceLine post={post} />
      </CardHeader>

      <CardContent className="p-4 pt-2">
        <PostBody post={post} clamp />
        {post.type !== 'poll' && post.type !== 'idea' && post.body.length > 300 && (
          <Link href={`/content/${post.id}`} className="text-sm text-primary hover:underline block mt-2">
            {t('Read more')}
          </Link>
        )}
      </CardContent>

      {reason === 'revisit' && <RevisitPrompt post={post} />}

      <CardFooter className="p-4 grid grid-cols-4 gap-1 border-t">
        <Button
          variant="ghost"
          size="sm"
          className={cn("text-muted-foreground hover:bg-muted hover:text-primary w-full", liked && "text-primary dark:text-primary-foreground")}
          onClick={toggleLike}
          aria-pressed={liked}
        >
          <ThumbsUp className={cn("mr-0 md:mr-2 h-4 w-4", liked && "fill-primary/20 dark:fill-primary-foreground/20")} />
          <span className="hidden md:inline">{t('Like')}</span>
          {likeCount > 0 && <span className="ml-1 text-xs">{likeCount}</span>}
        </Button>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:bg-muted hover:text-primary w-full">
              <MessageCircle className="mr-0 md:mr-2 h-4 w-4" /> <span className="hidden md:inline">{t('Comment')}</span>
            </Button>
          </SheetTrigger>
          <SheetContent
            side={isMobile ? "bottom" : "right"}
            className={cn("w-full sm:max-w-md flex flex-col p-0", isMobile ? "h-[75vh]" : "h-full")}
          >
            <SheetHeader className={cn("p-4 border-b", isMobile && "sr-only")}>
              <SheetTitle>{post.title}</SheetTitle>
              <SheetDescription>{t('Share your thoughts or see what others are saying.')}</SheetDescription>
            </SheetHeader>
            <CommentThread post={post} className="flex-grow min-h-0" />
          </SheetContent>
        </Sheet>

        <Button variant="ghost" size="sm" className="text-muted-foreground hover:bg-muted hover:text-primary w-full" onClick={share}>
          <Share2 className="mr-0 md:mr-2 h-4 w-4" /> <span className="hidden md:inline">{t('Share')}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn("text-muted-foreground hover:bg-muted hover:text-primary w-full", saved && "text-primary dark:text-primary-foreground")}
          onClick={toggleSave}
          aria-pressed={saved}
        >
          <Bookmark className={cn("mr-0 md:mr-2 h-4 w-4", saved && "fill-current")} /> <span className="hidden md:inline">{t('Save')}</span>
        </Button>
      </CardFooter>
    </Card>
  );
}
