"use client";

import { LegalDocument } from '@/components/LegalDocument';

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      updated="26 September 2026"
      intro={
        <p>
          This policy explains what information Knowledgeable collects, why, who processes it and the choices you
          have. We collect only what the service needs to work, and we do not sell personal data.
        </p>
      }
      sections={[
        {
          heading: 'Information you give us',
          body: (
            <ul className="list-disc space-y-1 pl-6">
              <li><strong>Account:</strong> your email address, name, handle, and — if you add them — a profile picture and bio. Passwords are handled by Google Firebase Authentication; we never see or store them.</li>
              <li><strong>Interests:</strong> the subjects you choose, used to build your feed.</li>
              <li><strong>Private details (optional):</strong> nationality, country, spoken languages and birth year. Only you can see these.</li>
              <li><strong>Content:</strong> posts, comments, poll votes, likes, saved posts, uploaded images, videos and documents, and direct messages.</li>
              <li><strong>Reading activity:</strong> the books on your lists, your reading progress and the books you finish.</li>
            </ul>
          ),
        },
        {
          heading: 'Who can see it',
          body: (
            <ul className="list-disc space-y-1 pl-6">
              <li>Your profile, posts and comments are visible to signed-in members.</li>
              <li>Your reading lists are visible to signed-in members unless you turn this off in your privacy settings.</li>
              <li>Your saved posts, private details and individual poll votes are visible only to you. Poll totals are public.</li>
              <li>Direct messages are visible only to the two people in the conversation.</li>
            </ul>
          ),
        },
        {
          heading: 'How we use it',
          body: (
            <p>
              To run your account, show you a personalised feed, save your reading progress, resurface ideas you saved,
              deliver messages, keep the service secure and prevent abuse. Legal bases (UK/EU GDPR): performance of our
              contract with you, and our legitimate interest in keeping the service safe.
            </p>
          ),
        },
        {
          heading: 'Service providers',
          body: (
            <ul className="list-disc space-y-1 pl-6">
              <li><strong>Google Firebase / Google Cloud</strong> hosts accounts, the database and uploaded files.</li>
              <li><strong>Google Gemini</strong> processes the text you send when you use an AI helper (summaries, questions, search explanations). Text is only sent when you use one of these features.</li>
              <li><strong>Open Library and OpenAlex</strong> receive your search terms (not your identity) to suggest related books and academic papers.</li>
            </ul>
          ),
        },
        {
          heading: 'Cookies and local storage',
          body: (
            <p>
              We use one essential cookie to keep you signed in securely. Your browser also stores your theme, text size,
              language and reader preferences on your device. We do not use advertising or tracking cookies.
            </p>
          ),
        },
        {
          heading: 'How long we keep it',
          body: (
            <p>
              We keep your information for as long as your account exists. When you delete your account (Settings →
              Account → Delete account), we permanently delete your profile, content, reading history, messages and
              uploaded files. Anonymous poll totals may remain.
            </p>
          ),
        },
        {
          heading: 'Your rights',
          body: (
            <p>
              You can see and correct your information in Settings, hide your reading lists, and delete your account at
              any time. Under UK/EU law you may also ask for a copy of your data, object to processing, or complain to
              your data protection authority (in the UK, the ICO).
            </p>
          ),
        },
        {
          heading: 'Children',
          body: <p>Knowledgeable is not intended for children under 16. [Confirm the minimum age with your lawyer.]</p>,
        },
        {
          heading: 'Contact',
          body: <p>[Add the name of the company operating Knowledgeable and a contact email for privacy requests.]</p>,
        },
      ]}
    />
  );
}
