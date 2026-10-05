"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Loader2 } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/contexts/LanguageContext';
import { ImportFailed, importToLibrary, type ImportRequest } from '@/lib/data/discover';

/** Copies a work into our library, then opens its page (or straight into the reader). */
export function ImportButton({
  request,
  label,
  openReader = false,
  ...props
}: { request: ImportRequest; label: string; openReader?: boolean } & Omit<ButtonProps, 'onClick'>) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const bookId = await importToLibrary(request);
      router.push(openReader ? `/read/${bookId}` : `/book/${bookId}`);
    } catch (error) {
      const code = error instanceof ImportFailed ? error.code : '';
      toast({
        title: t('Could not add this to the library'),
        description: code === 'not_open_licence'
          ? t("Its licence doesn't allow us to host it.")
          : code === 'no_text' ? t('No readable text was found.') : t('Please try again.'),
        variant: 'destructive',
      });
      setBusy(false);
    }
  };

  return (
    <Button onClick={run} disabled={busy} {...props}>
      {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <BookOpen className="mr-1.5 h-3.5 w-3.5" />}
      {busy ? t('Adding to the library…') : label}
    </Button>
  );
}
