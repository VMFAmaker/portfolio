"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BookOpen, CheckSquare, Clapperboard, FileText, HelpCircle, Lightbulb, LinkIcon, ListChecks,
  Loader2, MessageSquareQuote, PlusCircle, Send, Sparkles, UploadCloud, XCircle,
} from 'lucide-react';
import { summarizeDocument } from '@/ai/flows/summarize-document';
import { generateDiscussionQuestions } from '@/ai/flows/generate-discussion-questions';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useCurrentUser } from '@/contexts/AuthContext';
import { listCatalog, searchCatalog } from '@/lib/data/books';
import {
  createPost, IDEA_MAX_LENGTH, MAX_DOCUMENT_MB, MAX_IMAGE_MB, MAX_POLL_OPTIONS, MAX_POST_TOPICS, MAX_VIDEO_MB,
  MIN_POLL_OPTIONS, POST_BODY_MAX_LENGTH, searchPosts, TITLE_MAX_LENGTH,
} from '@/lib/data/posts';
import { SUBJECTS } from '@/lib/taxonomy';
import { useI18n } from '@/contexts/LanguageContext';
import { msg } from '@/lib/i18n/core';
import type { Book, PostSource, PostType } from '@/lib/types';

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const DOCUMENT_TYPES = ['application/pdf', 'text/plain', 'application/epub+zip'];

const CONTENT_TYPES: { value: PostType; label: string; icon: React.ElementType; hint: string }[] = [
  { value: 'idea', label: msg('Idea'), icon: Lightbulb, hint: msg('One insight in a few sentences — ideally from a book or paper.') },
  { value: 'summary', label: msg('Summary'), icon: Sparkles, hint: msg('Summarise a chapter, book or paper in your own words.') },
  { value: 'questions', label: msg('Discussion questions'), icon: HelpCircle, hint: msg('Questions to spark a discussion.') },
  { value: 'opinion', label: msg('Opinion / commentary'), icon: MessageSquareQuote, hint: msg('Your take, backed by sources where possible.') },
  { value: 'article', label: msg('Article'), icon: FileText, hint: msg('A longer piece you wrote.') },
  { value: 'research', label: msg('Research upload'), icon: UploadCloud, hint: msg('Share your own paper (PDF) with an abstract.') },
  { value: 'poll', label: msg('Poll / questionnaire'), icon: CheckSquare, hint: msg('Ask the community a question.') },
  { value: 'reel', label: msg('Reel (short video)'), icon: Clapperboard, hint: msg('A short vertical video explaining one thing.') },
];

const SOURCE_TYPES: PostType[] = ['idea', 'summary', 'questions', 'opinion'];

interface SourceSuggestion {
  source: PostSource;
  subtitle: string;
}

function checkFile(file: File, allowed: string[], maxMb: number): string | null {
  if (!allowed.includes(file.type)) return msg('That file type is not supported.');
  if (file.size > maxMb * 1024 * 1024) return msg('Files must be smaller than {size} MB.');
  return null;
}

interface TextEditorComponentProps {
  initialType?: PostType;
  initialBookId?: string;
}

export function TextEditorComponent({ initialType = 'idea', initialBookId }: TextEditorComponentProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile } = useCurrentUser();
  const { t, topic } = useI18n();

  const [contentType, setContentType] = useState<PostType>(initialType);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const [authors, setAuthors] = useState('');

  const [catalog, setCatalog] = useState<Book[]>([]);
  const [sourceQuery, setSourceQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SourceSuggestion[]>([]);
  const [source, setSource] = useState<PostSource | null>(null);

  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [summaryResult, setSummaryResult] = useState<string | null>(null);
  const [questionsResult, setQuestionsResult] = useState<string[] | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  useEffect(() => {
    listCatalog()
      .then((books) => {
        setCatalog(books);
        const book = initialBookId ? books.find((b) => b.id === initialBookId) : undefined;
        if (book) {
          setSource({ kind: 'book', id: book.id, title: book.title });
          setSourceQuery(book.title);
          setTopics(book.topics.slice(0, MAX_POST_TOPICS));
        }
      })
      .catch(() => undefined);
  }, [initialBookId]);

  // Source search: books from the catalog + articles/research on the platform, or a pasted https link.
  useEffect(() => {
    const q = sourceQuery.trim();
    if (q.length < 2 || (source && source.title === q)) {
      setSuggestions([]);
      return;
    }
    if (/^https:\/\/\S+$/i.test(q)) {
      setSuggestions([{ source: { kind: 'url', title: q.replace(/^https:\/\//, '').slice(0, 120), url: q }, subtitle: t('Web link') }]);
      return;
    }
    const books: SourceSuggestion[] = searchCatalog(catalog, q).slice(0, 5).map((b) => ({
      source: { kind: 'book', id: b.id, title: b.title },
      subtitle: b.author,
    }));
    setSuggestions(books);
    const timer = setTimeout(() => {
      searchPosts(q, 5)
        .then((posts) => {
          const papers = posts
            .filter((p) => p.type === 'article' || p.type === 'research')
            .map((p) => ({ source: { kind: 'post' as const, id: p.id, title: p.title }, subtitle: t('Paper on Knowledgeable') }));
          setSuggestions([...books, ...papers].slice(0, 8));
        })
        .catch(() => undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [sourceQuery, catalog, source, t]);

  const bodyLimit = contentType === 'idea' ? IDEA_MAX_LENGTH : POST_BODY_MAX_LENGTH;
  const needsBody = contentType !== 'poll' && contentType !== 'reel';
  const typeInfo = CONTENT_TYPES.find((t) => t.value === contentType)!;

  const problems = useMemo(() => {
    const list: string[] = [];
    if (!title.trim()) list.push(t('Add a title.'));
    if (topics.length === 0) list.push(t('Pick at least one topic.'));
    if (needsBody && !text.trim()) list.push(t('Write something.'));
    if (text.length > bodyLimit) list.push(t('Keep it under {count} characters.', { count: bodyLimit }));
    if (contentType === 'poll') {
      if (!pollQuestion.trim()) list.push(t('Add a poll question.'));
      if (pollOptions.filter((o) => o.trim()).length < MIN_POLL_OPTIONS || pollOptions.some((o) => !o.trim())) {
        list.push(t('Fill in at least {count} poll options.', { count: MIN_POLL_OPTIONS }));
      }
    }
    if (contentType === 'reel' && !videoFile) list.push(t('Choose a video.'));
    return list;
  }, [title, topics, needsBody, text, bodyLimit, contentType, pollQuestion, pollOptions, videoFile, t]);

  const handleFile = (setter: (f: File | null) => void, allowed: string[], maxMb: number) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null;
      if (file) {
        const problem = checkFile(file, allowed, maxMb);
        if (problem) {
          toast({ title: t('File not accepted'), description: t(problem, { size: maxMb }), variant: 'destructive' });
          event.target.value = '';
          setter(null);
          return;
        }
      }
      setter(file);
    };

  const handleSummarize = async () => {
    if (!text.trim()) return;
    setIsLoadingSummary(true);
    setSummaryResult(null);
    try {
      const result = await summarizeDocument({ documentContent: text });
      if (result.ok) setSummaryResult(result.data.summary);
      else toast({ title: t("Couldn't summarise"), description: t(result.error), variant: "destructive" });
    } catch {
      toast({ title: t("Couldn't summarise"), description: t('Please try again later.'), variant: "destructive" });
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const handleGenerateQuestions = async () => {
    const contentToUse = summaryResult || text;
    if (!contentToUse.trim()) return;
    setIsLoadingQuestions(true);
    setQuestionsResult(null);
    try {
      const result = await generateDiscussionQuestions({ text: contentToUse });
      if (result.ok) setQuestionsResult(result.data.questions);
      else toast({ title: t("Couldn't generate questions"), description: t(result.error), variant: "destructive" });
    } catch {
      toast({ title: t("Couldn't generate questions"), description: t('Please try again later.'), variant: "destructive" });
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const toggleTopic = (id: string, checked: boolean) => {
    setTopics((prev) => {
      if (!checked) return prev.filter((t) => t !== id);
      if (prev.length >= MAX_POST_TOPICS) {
        toast({ title: t('Limit reached'), description: t('You can select up to {count} topics.', { count: MAX_POST_TOPICS }) });
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleSubmit = async () => {
    if (problems.length) {
      toast({ title: t('Almost there'), description: problems[0], variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const postId = await createPost(
        profile,
        {
          type: contentType,
          title,
          body: needsBody || contentType === 'reel' ? text : '',
          topics,
          authors: contentType === 'article' || contentType === 'research'
            ? authors.split(',').map((a) => a.trim()).filter(Boolean).slice(0, 20)
            : undefined,
          source: SOURCE_TYPES.includes(contentType) && source ? source : undefined,
          poll: contentType === 'poll' ? { question: pollQuestion, options: pollOptions } : undefined,
          imageFile: contentType !== 'reel' && contentType !== 'poll' ? imageFile : null,
          videoFile: contentType === 'reel' ? videoFile : null,
          documentFile: contentType === 'research' ? documentFile : null,
        },
        (fraction) => setUploadProgress(fraction)
      );
      toast({ title: t('Posted!'), description: t('Your post is live.') });
      router.push(`/content/${postId}`);
    } catch {
      toast({
        title: t('Could not publish'),
        description: user.emailVerified ? t('Check your content and try again.') : t('Verify your email address before posting.'),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  return (
    <Card className="w-full shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">{t('Content creator')}</CardTitle>
        <CardDescription>{t('Share an idea, summary, question, paper, poll or short video.')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!user.emailVerified && (
          <Alert>
            <AlertTitle>{t('Verify your email to publish')}</AlertTitle>
            <AlertDescription>{t('You can draft here, but posting unlocks once your email address is verified.')}</AlertDescription>
          </Alert>
        )}

        <div>
          <Label htmlFor="contentType" className="block text-sm font-medium mb-1">{t('Content type')} *</Label>
          <Select value={contentType} onValueChange={(value: PostType) => setContentType(value)}>
            <SelectTrigger id="contentType" className="w-full">
              <SelectValue placeholder={t('Select content type')} />
            </SelectTrigger>
            <SelectContent>
              {CONTENT_TYPES.map(ct => (
                <SelectItem key={ct.value} value={ct.value}>
                  <div className="flex items-center gap-2">
                    <ct.icon className="h-4 w-4 text-muted-foreground" />
                    {t(ct.label)}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">{t(typeInfo.hint)}</p>
        </div>

        <div>
          <Label htmlFor="contentTitle" className="block text-sm font-medium mb-1">{t('Title')} *</Label>
          <Input
            id="contentTitle"
            value={title}
            maxLength={TITLE_MAX_LENGTH}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={contentType === 'idea' ? t('The idea in one line') : t('Enter a title for your content')}
          />
        </div>

        {SOURCE_TYPES.includes(contentType) && (
          <div>
            <Label htmlFor="relatedItem" className="block text-sm font-medium mb-1">
              {t('Source — book, paper or https link')} {contentType === 'idea' || contentType === 'summary' ? t('(recommended)') : t('(optional)')}
            </Label>
            <div className="relative">
              <Input
                id="relatedItem"
                value={sourceQuery}
                onChange={(e) => {
                  setSourceQuery(e.target.value);
                  if (source) setSource(null);
                }}
                placeholder={t('Search the library or paste a link…')}
                className="pr-10"
                autoComplete="off"
              />
              <LinkIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            </div>
            {suggestions.length > 0 && (
              <ul className="mt-1 max-h-48 overflow-y-auto rounded-md border p-1">
                {suggestions.map((s) => (
                  <li key={`${s.source.kind}-${s.source.id ?? s.source.url}`}>
                    <button
                      type="button"
                      className="w-full rounded-md p-2 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        setSource(s.source);
                        setSourceQuery(s.source.title);
                        setSuggestions([]);
                        if (s.source.kind === 'book' && topics.length === 0) {
                          const book = catalog.find((b) => b.id === s.source.id);
                          if (book) setTopics(book.topics.slice(0, MAX_POST_TOPICS));
                        }
                      }}
                    >
                      {s.source.title} <span className="text-muted-foreground">· {s.subtitle}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {source && (
              <div className="mt-2 p-2 border rounded-md flex items-center gap-3 text-sm">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 truncate">{source.title}</span>
                <Button variant="ghost" size="sm" onClick={() => { setSource(null); setSourceQuery(''); }}>{t('Clear')}</Button>
              </div>
            )}
          </div>
        )}

        {(contentType === 'article' || contentType === 'research') && (
          <div>
            <Label htmlFor="authors" className="block text-sm font-medium mb-1">{t('Author(s)')}</Label>
            <Input id="authors" value={authors} onChange={(e) => setAuthors(e.target.value)} placeholder={t('Comma-separated, e.g. A. Researcher, B. Scholar')} />
          </div>
        )}

        <div>
          <Label className="block text-sm font-medium mb-2">{t('Topics (up to {count})', { count: MAX_POST_TOPICS })} *</Label>
          <ScrollArea className="h-48 border rounded-md">
            <div className="space-y-3 p-3">
              {SUBJECTS.map((subject) => (
                <div key={subject.id}>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`topic-${subject.id}`}
                      checked={topics.includes(subject.id)}
                      onCheckedChange={(checked) => toggleTopic(subject.id, !!checked)}
                    />
                    <Label htmlFor={`topic-${subject.id}`} className="text-sm font-medium cursor-pointer">
                      {subject.emoji} {topic(subject.id)}
                    </Label>
                  </div>
                  {subject.nicheTopics?.length ? (
                    <div className="ml-6 mt-1 grid grid-cols-2 sm:grid-cols-3 gap-1">
                      {subject.nicheTopics.map((niche) => (
                        <div key={niche.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`topic-${niche.id}`}
                            checked={topics.includes(niche.id)}
                            onCheckedChange={(checked) => toggleTopic(niche.id, !!checked)}
                          />
                          <Label htmlFor={`topic-${niche.id}`} className="text-xs font-normal cursor-pointer">{topic(niche.id)}</Label>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </ScrollArea>
          {topics.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">{t('Selected: {topics}', { topics: topics.map((id) => topic(id)).join(', ') })}</p>
          )}
        </div>

        {contentType === 'poll' ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="pollQuestion" className="block text-sm font-medium mb-1">{t('Poll question')} *</Label>
              <Input id="pollQuestion" value={pollQuestion} maxLength={300} onChange={(e) => setPollQuestion(e.target.value)} placeholder={t('Enter your poll question')} />
            </div>
            <div>
              <Label className="block text-sm font-medium mb-1">{t('Poll options (min {min}, max {max})', { min: MIN_POLL_OPTIONS, max: MAX_POLL_OPTIONS })} *</Label>
              <div className="space-y-2">
                {pollOptions.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={option}
                      maxLength={120}
                      onChange={(e) => setPollOptions((opts) => opts.map((o, i) => (i === index ? e.target.value : o)))}
                      placeholder={t('Option {number}', { number: index + 1 })}
                    />
                    {pollOptions.length > MIN_POLL_OPTIONS && (
                      <Button variant="ghost" size="icon" onClick={() => setPollOptions((opts) => opts.filter((_, i) => i !== index))} aria-label={t('Remove option')}>
                        <XCircle className="h-5 w-5 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {pollOptions.length < MAX_POLL_OPTIONS && (
                <Button variant="outline" size="sm" onClick={() => setPollOptions((opts) => [...opts, ''])} className="mt-2">
                  <PlusCircle className="mr-2 h-4 w-4" /> {t('Add option')}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div>
            <Label htmlFor="mainText" className="block text-sm font-medium mb-1">
              {contentType === 'reel' ? t('Caption') : contentType === 'research' ? `${t('Abstract')} *` : `${t('Your text')} *`}
            </Label>
            <Textarea
              id="mainText"
              placeholder={contentType === 'idea' ? t('Explain the idea so someone could use it tomorrow.') : t('Write your thoughts here…')}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[150px] text-base"
              rows={contentType === 'idea' ? 5 : 8}
            />
            <p className={`text-xs mt-1 text-right ${text.length > bodyLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
              {text.length}/{bodyLimit}
            </p>
          </div>
        )}

        {contentType === 'reel' && (
          <div>
            <Label htmlFor="videoUpload" className="block text-sm font-medium mb-1">{t('Video (MP4, WebM or MOV, up to {size} MB)', { size: MAX_VIDEO_MB })} *</Label>
            <Input id="videoUpload" type="file" accept={VIDEO_TYPES.join(',')} onChange={handleFile(setVideoFile, VIDEO_TYPES, MAX_VIDEO_MB)} />
            <p className="text-xs text-muted-foreground mt-1">{t('Vertical 9:16, under 90 seconds works best.')}</p>
          </div>
        )}
        {contentType === 'research' && (
          <div>
            <Label htmlFor="docUpload" className="block text-sm font-medium mb-1">{t('Document (PDF, TXT or EPUB, up to {size} MB)', { size: MAX_DOCUMENT_MB })}</Label>
            <Input id="docUpload" type="file" accept={DOCUMENT_TYPES.join(',')} onChange={handleFile(setDocumentFile, DOCUMENT_TYPES, MAX_DOCUMENT_MB)} />
            <p className="text-xs text-muted-foreground mt-1">{t('Only upload work you wrote or have the right to share.')}</p>
          </div>
        )}
        {contentType !== 'reel' && contentType !== 'poll' && (
          <div>
            <Label htmlFor="imageUpload" className="block text-sm font-medium mb-1">{t('Image (optional, up to {size} MB)', { size: MAX_IMAGE_MB })}</Label>
            <Input id="imageUpload" type="file" accept={IMAGE_TYPES.join(',')} onChange={handleFile(setImageFile, IMAGE_TYPES, MAX_IMAGE_MB)} />
          </div>
        )}

        {needsBody && (
          <div className="flex flex-col sm:flex-row gap-4">
            <Button variant="secondary" onClick={handleSummarize} disabled={isLoadingSummary || !text.trim()} className="w-full sm:w-auto">
              {isLoadingSummary ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {t('Summarise text')}
            </Button>
            <Button variant="secondary" onClick={handleGenerateQuestions} disabled={isLoadingQuestions || (!text.trim() && !summaryResult)} className="w-full sm:w-auto">
              {isLoadingQuestions ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ListChecks className="mr-2 h-4 w-4" />}
              {t('Generate questions')}
            </Button>
          </div>
        )}

        {summaryResult && (
          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertTitle>{t('Generated summary')}</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <p className="p-3 bg-muted rounded-md whitespace-pre-wrap max-h-60 overflow-y-auto">{summaryResult}</p>
              <Button size="sm" variant="outline" onClick={() => setText(summaryResult.slice(0, bodyLimit))}>{t('Use this text')}</Button>
            </AlertDescription>
          </Alert>
        )}

        {questionsResult && questionsResult.length > 0 && (
          <Alert>
            <HelpCircle className="h-4 w-4" />
            <AlertTitle>{t('Generated discussion questions')}</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <ul className="list-disc pl-5 space-y-1 p-3 bg-muted rounded-md max-h-60 overflow-y-auto">
                {questionsResult.map((q, i) => <li key={i}>{q}</li>)}
              </ul>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setContentType('questions');
                  setText(questionsResult.map((q, i) => `${i + 1}. ${q}`).join('\n').slice(0, POST_BODY_MAX_LENGTH));
                }}
              >
                {t('Post these as discussion questions')}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {uploadProgress !== null && (
          <div className="space-y-1">
            <Progress value={uploadProgress * 100} className="h-2" />
            <p className="text-xs text-muted-foreground">{t('Uploading… {percent}%', { percent: Math.round(uploadProgress * 100) })}</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-end gap-2">
        <Button onClick={handleSubmit} disabled={submitting || !user.emailVerified} className="w-full sm:w-auto">
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} {t('Post')}
        </Button>
        {problems.length > 0 && <p className="text-xs text-muted-foreground">{problems[0]}</p>}
      </CardFooter>
    </Card>
  );
}
