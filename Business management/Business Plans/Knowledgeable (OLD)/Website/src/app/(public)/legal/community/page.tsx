"use client";

import { LegalDocument } from '@/components/LegalDocument';

export default function CommunityGuidelinesPage() {
  return (
    <LegalDocument
      title="Community Guidelines"
      updated="26 September 2026"
      intro={
        <p>
          Knowledgeable works when people can learn from each other in good faith. These guidelines apply to posts,
          comments, reels, polls and messages.
        </p>
      }
      sections={[
        {
          heading: 'Share knowledge honestly',
          body: (
            <p>
              Attach a source to ideas and summaries where you can. Make it clear what is your opinion and what is
              established fact. Correct yourself when you get something wrong.
            </p>
          ),
        },
        {
          heading: 'Respect other people',
          body: (
            <p>
              Disagree with ideas, not people. No harassment, bullying, threats, hate speech or discrimination based on
              who someone is.
            </p>
          ),
        },
        {
          heading: 'Respect creators',
          body: (
            <p>
              No plagiarism and no pirated books, papers or videos. Short quotations with credit are fine; copying whole
              chapters is not.
            </p>
          ),
        },
        {
          heading: 'Keep it safe and useful',
          body: (
            <p>
              No spam, scams, misleading health or financial claims, sexual content, or content that encourages harm.
              Polls should ask genuine questions; reels should teach something.
            </p>
          ),
        },
        {
          heading: 'Protect privacy',
          body: <p>Do not share other people’s personal information or private messages without their permission.</p>,
        },
        {
          heading: 'What happens if the rules are broken',
          body: (
            <p>
              We may remove content, limit features or suspend accounts, depending on how serious and how repeated the
              problem is.
            </p>
          ),
        },
      ]}
    />
  );
}
