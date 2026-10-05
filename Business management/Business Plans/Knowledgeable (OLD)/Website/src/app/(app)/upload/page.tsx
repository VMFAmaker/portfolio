"use client";

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { TextEditorComponent } from '@/components/TextEditorComponent';
import type { PostType } from '@/lib/types';
import { useI18n } from '@/contexts/LanguageContext';

const TYPES: PostType[] = ['idea', 'summary', 'questions', 'opinion', 'article', 'research', 'poll', 'reel'];

function UploadForm() {
  const params = useSearchParams();
  const requested = params.get('type') as PostType | null;
  return (
    <TextEditorComponent
      initialType={requested && TYPES.includes(requested) ? requested : 'idea'}
      initialBookId={params.get('book') ?? undefined}
    />
  );
}

export default function UploadPage() {
  const { t } = useI18n();
  return (
    <div className="max-w-4xl mx-auto w-full py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">{t('Create new content')}</h1>
      <Suspense>
        <UploadForm />
      </Suspense>
    </div>
  );
}
