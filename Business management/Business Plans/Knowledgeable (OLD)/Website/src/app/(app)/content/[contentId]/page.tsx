"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Bookmark, Loader2, Share2, ThumbsUp, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from "@/hooks/use-toast";
import { usePostActions } from '@/hooks/use-post-actions';
import { useCurrentUser } from '@/contexts/AuthContext';
import { deletePost, getPost } from '@/lib/data/posts';
import { PostBody, POST_TYPE_LABELS, SourceLine } from '@/components/posts/PostBody';
import { CommentThread } from '@/components/posts/CommentThread';
import { useI18n } from '@/contexts/LanguageContext';
import { useSafety } from '@/contexts/SafetyContext';
import { SafetyMenu } from '@/components/safety/SafetyMenu';
import type { Post } from '@/lib/types';
import { cn } from "@/lib/utils";

function PostDetail({ post }: { post: Post }) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const { t, topic, longDate } = useI18n();
  const { liked, likeCount, saved, toggleLike, toggleSave, share } = usePostActions(post);
  const isAuthor = post.authorId === user.uid;
  const { isBlocked, unblock } = useSafety();
  const [showAnyway, setShowAnyway] = useState(false);

  const remove = async () => {
    try {
      await deletePost(post);
      toast({ title: t('Post deleted') });
      router.replace('/');
    } catch {
      toast({ title: t('Could not delete the post'), variant: 'destructive' });
    }
  };

  if (isBlocked(post.authorId) && !showAnyway) {
    return (
      <Card className="p-6 text-center space-y-3">
        <p className="text-muted-foreground">{t('This post is from someone you blocked.')}</p>
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAnyway(true)}>{t('Show it anyway')}</Button>
          <Button variant="ghost" size="sm" onClick={() => unblock(post.authorId)}>{t('Unblock {name}', { name: post.authorName })}</Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <article>
        <Card className="shadow-lg rounded-xl overflow-hidden">
          <CardHeader className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={post.authorAvatarUrl} alt={post.authorName} />
                <AvatarFallback>{post.authorName.substring(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <Link href={`/profile/${post.authorId}`} className="font-semibold text-lg hover:underline">
                  {post.authorName}
                </Link>
                <p className="text-sm text-muted-foreground">
                  @{post.authorHandle} · {t('Posted on {date}', { date: longDate(post.createdAt) })}
                </p>
              </div>
              {!isAuthor && (
                <SafetyMenu target={{ type: 'post', id: post.id, userId: post.authorId, userName: post.authorName, context: post.title }} />
              )}
              {isAuthor && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={t('Delete post')}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('Delete this post?')}</AlertDialogTitle>
                      <AlertDialogDescription>{t("This removes the post and its media for everyone. It can't be undone.")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={remove}>{t('Delete')}</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t(POST_TYPE_LABELS[post.type])}</p>
            <CardTitle className="text-3xl font-bold">{post.title}</CardTitle>
            {post.authors?.length ? <p className="text-sm text-muted-foreground">{post.authors.join(', ')}</p> : null}
            <SourceLine post={post} />
            <div className="flex flex-wrap gap-1 pt-2">
              {post.topics.map((id) => (
                <Link key={id} href={`/category/${id}`}>
                  <Badge variant="outline">{topic(id)}</Badge>
                </Link>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <PostBody post={post} />
          </CardContent>
          <CardFooter className="p-6 grid grid-cols-3 gap-1 border-t">
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
      </article>

      <section className="mt-12 space-y-4">
        <h2 className="text-2xl font-semibold">{t('Discussion')}</h2>
        <Card className="overflow-hidden">
          <CommentThread post={post} />
        </Card>
      </section>
    </>
  );
}

export default function ContentDetailPage() {
  const params = useParams();
  const { t } = useI18n();
  const contentId = params.contentId as string;
  const [post, setPost] = useState<Post | null | undefined>(undefined);

  useEffect(() => {
    setPost(undefined);
    getPost(contentId).then(setPost).catch(() => setPost(null));
  }, [contentId]);

  return (
    <div className="max-w-3xl mx-auto w-full space-y-8 py-8">
      <Button variant="outline" asChild>
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4" /> {t('Back to feed')}
        </Link>
      </Button>
      {post === undefined ? (
        <div className="flex justify-center items-center min-h-[40vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : post === null ? (
        <p className="text-xl text-destructive text-center py-10">{t("This post doesn't exist or was deleted.")}</p>
      ) : (
        <PostDetail post={post} />
      )}
    </div>
  );
}
