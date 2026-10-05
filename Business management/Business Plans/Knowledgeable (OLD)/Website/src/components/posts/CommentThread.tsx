"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Send, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/contexts/AuthContext';
import { addComment, COMMENT_MAX_LENGTH, deleteComment, listComments } from '@/lib/data/posts';
import type { Comment, Post } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useI18n } from '@/contexts/LanguageContext';
import { useSafety } from '@/contexts/SafetyContext';
import { notify } from '@/lib/data/notifications';
import { SafetyMenu } from '@/components/safety/SafetyMenu';

export function CommentThread({ post, className }: { post: Post; className?: string }) {
  const { user, profile } = useCurrentUser();
  const { toast } = useToast();
  const { t, relative } = useI18n();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const { isBlocked } = useSafety();
  const visible = comments?.filter((c) => !isBlocked(c.authorId)) ?? null;

  useEffect(() => {
    listComments(post.id).then(setComments).catch(() => setComments([]));
  }, [post.id]);

  const submit = async () => {
    const clean = text.trim();
    if (!clean) return;
    setPosting(true);
    try {
      const created = await addComment(post.id, profile, clean);
      setComments((c) => [...(c ?? []), created]);
      setText('');
      notify({ type: 'comment', postId: post.id, commentId: created.id });
    } catch {
      toast({
        title: t('Comment not posted'),
        description: user.emailVerified ? t('Please try again. You can’t comment on posts from people who have blocked you.') : t('Verify your email address to comment.'),
        variant: 'destructive',
      });
    } finally {
      setPosting(false);
    }
  };

  const remove = async (commentId: string) => {
    try {
      await deleteComment(post.id, commentId);
      setComments((c) => (c ?? []).filter((x) => x.id !== commentId));
    } catch {
      toast({ title: t('Could not delete comment'), variant: 'destructive' });
    }
  };

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex-grow space-y-4 overflow-y-auto p-4">
        {visible === null ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        ) : visible.length === 0 ? (
          <p className="text-muted-foreground text-center py-6">{t('No comments yet. Be the first to share your thoughts!')}</p>
        ) : (
          visible.map((comment) => {
            const canDelete = comment.authorId === user.uid || post.authorId === user.uid;
            return (
              <div key={comment.id} className="flex items-start space-x-2.5">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={comment.authorAvatarUrl} alt={comment.authorName} />
                  <AvatarFallback className="text-xs">{comment.authorName.substring(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="bg-muted p-3 rounded-lg flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <Link href={`/profile/${comment.authorId}`} className="font-semibold text-sm hover:underline truncate">
                      {comment.authorName}
                    </Link>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {relative(comment.createdAt)}
                      </span>
                      <SafetyMenu
                        className="h-6 w-6"
                        target={{ type: 'comment', id: comment.id, userId: comment.authorId, userName: comment.authorName, context: `posts/${post.id}` }}
                      />
                      {canDelete && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => remove(comment.id)} aria-label={t('Delete comment')}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-card-foreground whitespace-pre-wrap break-words">{comment.text}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-3 border-t bg-background flex items-center gap-2 sticky bottom-0">
        <Avatar className="h-8 w-8">
          <AvatarImage src={profile.avatarUrl} alt={profile.displayName} />
          <AvatarFallback>{profile.displayName.substring(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <Textarea
          placeholder={t('What do you think?')}
          value={text}
          maxLength={COMMENT_MAX_LENGTH}
          onChange={(e) => setText(e.target.value)}
          rows={1}
          className="flex-grow resize-none rounded-md border bg-muted px-4 py-2 text-sm focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={submit}
          disabled={text.trim() === '' || posting}
          className="text-primary hover:bg-primary/10 rounded-full"
          aria-label={t('Post comment')}
        >
          {posting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </Button>
      </div>
    </div>
  );
}
