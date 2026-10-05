"use client";

import { useEffect, useState } from 'react';
import { CheckSquare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/contexts/AuthContext';
import { castVote, getMyVote } from '@/lib/data/posts';
import { useI18n } from '@/contexts/LanguageContext';
import type { Post } from '@/lib/types';

/** One vote per person (enforced by Firestore rules); results appear after voting. */
export function PollBlock({ post }: { post: Post }) {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { t } = useI18n();
  const [myVote, setMyVote] = useState<number | null | undefined>(undefined);
  const [choice, setChoice] = useState<string | undefined>();
  const [counts, setCounts] = useState<Record<string, number>>(post.pollCounts ?? {});
  const [submitting, setSubmitting] = useState(false);
  const options = post.poll?.options ?? [];
  const isAuthor = post.authorId === user.uid;

  useEffect(() => {
    getMyVote(post.id, user.uid).then(setMyVote).catch(() => setMyVote(null));
  }, [post.id, user.uid]);

  const total = options.reduce((sum, _, i) => sum + (counts[String(i)] ?? 0), 0);
  const showResults = myVote !== null && myVote !== undefined ? true : isAuthor;

  const vote = async () => {
    if (choice === undefined) return;
    const option = Number(choice);
    setSubmitting(true);
    try {
      await castVote(post.id, user.uid, option);
      setMyVote(option);
      setCounts((c) => ({ ...c, [String(option)]: (c[String(option)] ?? 0) + 1 }));
    } catch {
      toast({ title: t('Vote not recorded'), description: t('You may have already voted on this poll.'), variant: 'destructive' });
      getMyVote(post.id, user.uid).then(setMyVote).catch(() => undefined);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="font-medium text-base">{post.poll?.question}</p>
      {myVote === undefined ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : showResults ? (
        <div className="space-y-3">
          {options.map((option, i) => {
            const votes = counts[String(i)] ?? 0;
            const pct = total > 0 ? (votes / total) * 100 : 0;
            return (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className={myVote === i ? 'font-semibold' : undefined}>
                    {option} {myVote === i && <span className="text-xs text-muted-foreground">{t('(your vote)')}</span>}
                  </span>
                  <span className="text-muted-foreground text-xs">{votes} · {pct.toFixed(0)}%</span>
                </div>
                <Progress value={pct} className="h-2" />
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground text-right">{total === 1 ? t('1 vote') : t('{count} votes', { count: total })}</p>
        </div>
      ) : (
        <>
          <RadioGroup value={choice} onValueChange={setChoice} className="space-y-2">
            {options.map((option, index) => (
              <div key={index} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-muted/50">
                <RadioGroupItem value={String(index)} id={`${post.id}-option-${index}`} />
                <Label htmlFor={`${post.id}-option-${index}`} className="flex-1 cursor-pointer">{option}</Label>
              </div>
            ))}
          </RadioGroup>
          <Button onClick={vote} disabled={choice === undefined || submitting} className="mt-3 w-full sm:w-auto">
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckSquare className="mr-2 h-4 w-4" />} {t('Vote')}
          </Button>
        </>
      )}
    </div>
  );
}
