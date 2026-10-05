"use client";

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/contexts/LanguageContext';

export function BackLink() {
  const router = useRouter();
  const { t } = useI18n();
  return (
    <Button variant="ghost" className="-ml-3 mb-4" onClick={() => (window.history.length > 1 ? router.back() : router.push('/'))}>
      <ArrowLeft className="mr-2 h-4 w-4" /> {t('Back')}
    </Button>
  );
}
