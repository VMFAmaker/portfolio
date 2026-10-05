"use client";

import { useEffect, useState, type ReactNode } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/LanguageContext';
import { ANSWER_MAX_LENGTH, getReflection, saveReflection } from '@/lib/data/notes';
import { suggestReflectionQuestions } from '@/ai/flows/reflection-questions';
import { msg } from '@/lib/i18n/core';
import type { Book } from '@/lib/types';

/** Open questions — there are no right or wrong answers, they just help the learning stick. */
export const DEFAULT_REFLECTION_QUESTIONS = [
  msg('In one sentence, what was it about?'),
  msg('What is the most important idea you took from it?'),
  msg('What surprised you, or changed your mind?'),
  msg('What would you question or disagree with?'),
  msg('How could you use this in your own life or work?'),
  msg('Who would you recommend it to, and why?'),
];

export function ReflectionDialog({ book, trigger, defaultOpen = false }: { book: Book; trigger: ReactNode; defaultOpen?: boolean }) {
  const { user } = useCurrentUser();
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const [open, setOpen] = useState(defaultOpen);
  const [answers, setAnswers] = useState<Array<{ question: string; answer: string }> | null>(null);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  useEffect(() => {
    if (!open || answers) return;
    getReflection(user.uid, book.id)
      .then((existing) => {
        const saved = existing?.answers ?? [];
        const defaults = DEFAULT_REFLECTION_QUESTIONS.map((q) => t(q)).filter((q) => !saved.some((a) => a.question === q));
        setAnswers([...saved, ...defaults.map((question) => ({ question, answer: '' }))]);
      })
      .catch(() => setAnswers(DEFAULT_REFLECTION_QUESTIONS.map((q) => ({ question: t(q), answer: '' }))));
  }, [open, answers, user.uid, book.id, t]);

  const suggest = async () => {
    setSuggesting(true);
    try {
      const result = await suggestReflectionQuestions({ title: book.title, author: book.author || undefined, kind: book.kind, language: locale });
      if (!result.ok) {
        toast({ title: t('No suggestions right now'), description: t(result.error), variant: 'destructive' });
        return;
      }
      setAnswers((prev) => {
        const current = prev ?? [];
        const extra = result.data.questions.filter((q) => !current.some((a) => a.question === q));
        return [...extra.map((question) => ({ question, answer: '' })), ...current];
      });
    } finally {
      setSuggesting(false);
    }
  };

  const save = async () => {
    if (!answers) return;
    setSaving(true);
    try {
      await saveReflection(user.uid, book.id, book.title, answers);
      toast({ title: t('Reflection saved'), description: t('Find it any time in My notes.') });
      setOpen(false);
    } catch {
      toast({ title: t('Could not save'), description: t('Please try again.'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('Reflect on {title}', { title: book.title })}</DialogTitle>
          <DialogDescription>
            {t('There are no right or wrong answers. Putting what you learned into your own words is what makes it stick. Answer as many as you like.')}
          </DialogDescription>
        </DialogHeader>
        {!answers ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
        ) : (
          <div className="space-y-5">
            <Button type="button" variant="outline" size="sm" onClick={suggest} disabled={suggesting}>
              {suggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {t('Suggest questions about this work')}
            </Button>
            {answers.map((item, i) => (
              <div key={`${item.question}-${i}`} className="space-y-2">
                <Label htmlFor={`reflection-${i}`} className="leading-snug">{item.question}</Label>
                <Textarea
                  id={`reflection-${i}`}
                  rows={3}
                  maxLength={ANSWER_MAX_LENGTH}
                  value={item.answer}
                  onChange={(e) => setAnswers((prev) => (prev ?? []).map((a, j) => (j === i ? { ...a, answer: e.target.value } : a)))}
                />
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>{t('Cancel')}</Button>
          <Button onClick={save} disabled={saving || !answers}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('Save reflection')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
