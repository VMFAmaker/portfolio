"use client";

import { useEffect, useState } from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';
import { fetchAttachment } from '@/lib/data/chat';
import { useI18n } from '@/contexts/LanguageContext';
import type { ChatAttachment } from '@/lib/types';
import { cn } from '@/lib/utils';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * A file shared in a chat. Files have no public link: they're fetched through the SDK, so the
 * storage rules decide who can open them (only the two people in the conversation).
 */
export function AttachmentBubble({ attachment, mine }: { attachment: ChatAttachment; mine: boolean }) {
  const { t } = useI18n();
  const isImage = attachment.contentType.startsWith('image/');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isImage) return;
    let url: string | null = null;
    let cancelled = false;
    fetchAttachment(attachment)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [attachment, isImage]);

  const open = async () => {
    setBusy(true);
    try {
      const blob = await fetchAttachment(attachment);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.name;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1.5">
      {isImage && previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- a local blob URL, not optimisable
        <img src={previewUrl} alt={attachment.name} className="max-h-64 w-auto rounded-md object-contain" />
      )}
      {isImage && !previewUrl && !failed && (
        <div className="flex h-32 w-48 items-center justify-center rounded-md bg-muted/40">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}
      <button
        type="button"
        onClick={open}
        className={cn(
          'flex w-full max-w-xs items-center gap-2 rounded-md border px-2.5 py-2 text-left text-sm transition-colors',
          mine ? 'border-primary-foreground/30 hover:bg-primary-foreground/10' : 'hover:bg-muted'
        )}
      >
        <FileText className="h-5 w-5 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{attachment.name}</span>
          <span className={cn('block text-xs', mine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
            {failed ? t('Could not open the file') : formatSize(attachment.size)}
          </span>
        </span>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" aria-label={t('Download')} />}
      </button>
    </div>
  );
}
