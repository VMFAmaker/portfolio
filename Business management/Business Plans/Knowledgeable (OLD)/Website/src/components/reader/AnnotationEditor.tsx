"use client";

import { useEffect, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/contexts/LanguageContext';
import { NOTE_MAX_LENGTH } from '@/lib/data/notes';
import type { HighlightColour } from '@/lib/types';
import { cn } from '@/lib/utils';
import { HIGHLIGHT_COLOURS, highlightClass } from '@/components/reader/highlight-colours';

interface AnnotationEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: string;
  initialNote?: string;
  initialColour?: HighlightColour;
  /** Present when editing an existing highlight; enables "Delete". */
  onDelete?: () => Promise<void>;
  onSave: (note: string, colour: HighlightColour) => Promise<void>;
}

export function AnnotationEditor({ open, onOpenChange, quote, initialNote = '', initialColour = 'yellow', onDelete, onSave }: AnnotationEditorProps) {
  const { t } = useI18n();
  const [note, setNote] = useState(initialNote);
  const [colour, setColour] = useState<HighlightColour>(initialColour);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setNote(initialNote);
      setColour(initialColour);
    }
  }, [open, initialNote, initialColour]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{onDelete ? t('Your highlight') : t('Add a note')}</DialogTitle>
          <DialogDescription className="sr-only">{t('Write a note about the highlighted passage.')}</DialogDescription>
        </DialogHeader>
        <blockquote className={cn('rounded-md border-l-4 border-primary p-3 font-serif text-sm leading-relaxed', highlightClass(colour))}>
          {quote}
        </blockquote>
        <div className="flex items-center gap-2" role="radiogroup" aria-label={t('Highlight colour')}>
          {HIGHLIGHT_COLOURS.map((c) => (
            <button
              key={c.value}
              type="button"
              role="radio"
              aria-checked={colour === c.value}
              aria-label={t(c.label)}
              onClick={() => setColour(c.value)}
              className={cn('h-7 w-7 rounded-full border-2', c.swatch, colour === c.value ? 'border-foreground' : 'border-transparent')}
            />
          ))}
        </div>
        <div className="space-y-2">
          <Label htmlFor="annotation-note">{t('Note')}</Label>
          <Textarea
            id="annotation-note"
            rows={4}
            maxLength={NOTE_MAX_LENGTH}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('What does this make you think of?')}
          />
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {onDelete ? (
            <Button variant="ghost" className="text-destructive" disabled={busy} onClick={() => run(onDelete)}>
              <Trash2 className="mr-2 h-4 w-4" /> {t('Delete highlight')}
            </Button>
          ) : <span />}
          <Button disabled={busy} onClick={() => run(() => onSave(note, colour))}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('Save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
