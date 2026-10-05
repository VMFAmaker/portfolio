"use client";

import Link from 'next/link';
import { LegalDocument } from '@/components/LegalDocument';

export default function UserAgreementPage() {
  return (
    <LegalDocument
      title="User Agreement"
      updated="26 September 2026"
      intro={<p>By creating an account or using Knowledgeable you agree to these terms. Please read them carefully.</p>}
      sections={[
        {
          heading: 'Your account',
          body: (
            <p>
              You must give accurate information, keep your password secure and tell us if you think your account has been
              accessed without permission. You are responsible for activity on your account. One person, one account.
            </p>
          ),
        },
        {
          heading: 'Your content',
          body: (
            <p>
              You own what you post. By posting, you give Knowledgeable a worldwide, non-exclusive, royalty-free licence to
              host, display and distribute it within the service so others can see it. You can delete your posts at any
              time, which ends this licence except for copies others have already shared.
            </p>
          ),
        },
        {
          heading: 'Copyright and sources',
          body: (
            <p>
              Only upload material you created or have the right to share. Quote sparingly and credit your sources. Do not
              upload books, papers or videos you do not have rights to. If you believe something infringes your
              copyright, contact us and we will remove it where appropriate.
            </p>
          ),
        },
        {
          heading: 'Community rules',
          body: (
            <p>
              You must follow the <Link href="/legal/community" className="text-primary underline">Community Guidelines</Link>.
              We may remove content or suspend accounts that break them.
            </p>
          ),
        },
        {
          heading: 'Books in the reader',
          body: (
            <p>
              Books offered for reading in the app are public-domain editions. Other books are listed for tracking and
              discussion only; links to external services are provided for convenience and those services have their own
              terms.
            </p>
          ),
        },
        {
          heading: 'AI helpers',
          body: (
            <p>
              AI-generated summaries, questions and explanations can be wrong. Check important information against
              reliable sources before relying on it.
            </p>
          ),
        },
        {
          heading: 'Ending your account',
          body: <p>You can delete your account at any time in Settings. We may suspend or close accounts that break these terms.</p>,
        },
        {
          heading: 'Liability',
          body: (
            <p>
              The service is provided “as is”. To the extent the law allows, we are not liable for indirect losses. Nothing
              in these terms limits rights you have as a consumer that cannot be limited by law.
            </p>
          ),
        },
        {
          heading: 'Changes and governing law',
          body: (
            <p>
              We will tell you about significant changes before they take effect. [Add the governing law and courts, and
              the legal entity operating Knowledgeable.]
            </p>
          ),
        },
      ]}
    />
  );
}
