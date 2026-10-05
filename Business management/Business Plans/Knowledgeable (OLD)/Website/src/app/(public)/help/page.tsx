"use client";

import Link from 'next/link';
import { FileText, ScrollText, Users } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n } from '@/contexts/LanguageContext';
import { msg } from '@/lib/i18n/core';

/** Set this to show a contact address at the bottom of the Help Centre. */
const SUPPORT_EMAIL = '';

const FAQ = [
  {
    q: msg('What is Knowledgeable?'),
    a: msg('A place to learn a little every day. People share short ideas from books and papers, summaries, questions, polls and short videos, and you can read classic books in full inside the app.'),
  },
  {
    q: msg('How does my feed choose what to show?'),
    a: msg('It shows posts from the subjects you picked when you joined, in a different order each time. Now and then it adds a post from a closely related topic to widen your horizons. You can change your subjects in Settings → Personalise feed.'),
  },
  {
    q: msg('Why do saved posts come back in my feed?'),
    a: msg('When you save a post, it returns after a day, then after longer and longer gaps. Answering “Got it” spaces it out further; “Show me again” brings it back sooner. Revisiting ideas like this is one of the most reliable ways to remember them.'),
  },
  {
    q: msg('Which books can I read in the app?'),
    a: msg('Books marked “Read free in the app” are public-domain classics you can read in full; your place is saved automatically. Other books can be added to your lists and discussed, and we link to legal places to read or borrow them.'),
  },
  {
    q: msg('Who can see what I am reading?'),
    a: msg('By default, other members can see your reading lists on your profile. You can hide them in Settings → Account → Account details → Privacy. Saved posts and your private details are only ever visible to you.'),
  },
  {
    q: msg('Why do I need to verify my email?'),
    a: msg('Verifying proves the address is yours and keeps spam accounts out. You can read and browse straight away; posting, commenting and messaging unlock once you have clicked the link we email you.'),
  },
  {
    q: msg('How do I change the language or text size?'),
    a: msg('Go to Settings. Language is under “Language”, and text size under “Appearance”. Both are remembered on this device.'),
  },
  {
    q: msg('How do I delete my account?'),
    a: msg('Settings → Account → Delete account. After you confirm your password, we permanently delete your profile, posts, comments, reading history, messages and uploaded files.'),
  },
];

export default function HelpCentrePage() {
  const { t } = useI18n();
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">{t('Help Centre')}</h1>
        <p className="mt-2 text-muted-foreground">{t('Answers to common questions about using Knowledgeable.')}</p>
      </div>

      <Accordion type="multiple" className="w-full">
        {FAQ.map((item) => (
          <AccordionItem key={item.q} value={item.q}>
            <AccordionTrigger className="text-left text-lg">{t(item.q)}</AccordionTrigger>
            <AccordionContent className="text-base leading-relaxed text-muted-foreground">{t(item.a)}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">{t('Policies')}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { href: '/legal/terms', label: msg('User Agreement'), icon: ScrollText },
            { href: '/legal/privacy', label: msg('Privacy Policy'), icon: FileText },
            { href: '/legal/community', label: msg('Community Guidelines'), icon: Users },
          ].map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center gap-3 p-4">
                  <link.icon className="h-5 w-5 text-primary" />
                  <span className="font-medium">{t(link.label)}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {SUPPORT_EMAIL && (
        <p className="text-muted-foreground">
          {t('Still stuck? Email us at')} <a className="text-primary underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </p>
      )}
    </div>
  );
}
