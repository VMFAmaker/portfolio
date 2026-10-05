"use client";

import { useState } from 'react';
import { Loader2, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/LanguageContext';
import { msg } from '@/lib/i18n/core';
import { useSafety } from '@/contexts/SafetyContext';
import {
  REPORT_DETAILS_MAX, REPORT_EVIDENCE_MAX, REPORT_FILE_MAX_MB, REPORT_FILE_TYPES, REPORT_MAX_FILES, REPORT_REASONS, submitReport,
} from '@/lib/data/safety';
import type { ReportReason, ReportTargetType } from '@/lib/types';

export interface ReportTarget {
  type: ReportTargetType;
  id: string;
  userId: string;
  /** Display name of the person being reported (for the "also block" option). */
  userName: string;
  context?: string;
}

const TITLES: Record<ReportTargetType, string> = {
  user: msg('Report {name}'),
  post: msg('Report post'),
  comment: msg('Report comment'),
  message: msg('Report message'),
};

export function ReportDialog({ target, open, onOpenChange }: { target: ReportTarget; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user } = useCurrentUser();
  const { t } = useI18n();
  const { toast } = useToast();
  const { block, isBlocked } = useSafety();
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [details, setDetails] = useState('');
  const [evidence, setEvidence] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setReason('');
    setDetails('');
    setEvidence('');
    setFiles([]);
    setAlsoBlock(false);
  };

  const addFiles = (list: FileList | null) => {
    const accepted: File[] = [];
    for (const file of Array.from(list ?? [])) {
      if (!REPORT_FILE_TYPES.includes(file.type) || file.size > REPORT_FILE_MAX_MB * 1024 * 1024) {
        toast({ title: t('File not accepted'), description: t('Use images or PDFs under {size} MB.', { size: REPORT_FILE_MAX_MB }), variant: 'destructive' });
        continue;
      }
      accepted.push(file);
    }
    setFiles((prev) => [...prev, ...accepted].slice(0, REPORT_MAX_FILES));
  };

  const submit = async () => {
    if (!reason) return;
    setBusy(true);
    try {
      await submitReport({
        reporterId: user.uid,
        targetType: target.type,
        targetId: target.id,
        targetUserId: target.userId,
        context: target.context,
        reason,
        details,
        evidence,
        files,
      });
      if (alsoBlock) await block(target.userId);
      toast({ title: t('Thanks for letting us know'), description: t('Our team will review your report. The person you reported won’t be told who reported them.') });
      reset();
      onOpenChange(false);
    } catch {
      toast({ title: t('Could not send the report'), description: t('Please try again.'), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t(TITLES[target.type], { name: target.userName })}</DialogTitle>
          <DialogDescription>{t('Reports are private. Tell us what’s wrong and add any evidence that helps.')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t('Reason')} *</legend>
            <RadioGroup value={reason} onValueChange={(v) => setReason(v as ReportReason)} className="space-y-1">
              {REPORT_REASONS.map((r) => (
                <label key={r.value} htmlFor={`reason-${r.value}`} className="flex cursor-pointer items-start gap-3 rounded-md border p-2.5 hover:bg-muted/50">
                  <RadioGroupItem value={r.value} id={`reason-${r.value}`} className="mt-0.5" />
                  <span>
                    <span className="block text-sm font-medium">{t(r.label)}</span>
                    <span className="block text-xs text-muted-foreground">{t(r.hint)}</span>
                  </span>
                </label>
              ))}
            </RadioGroup>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="report-details">{t('What happened?')}</Label>
            <Textarea id="report-details" rows={3} maxLength={REPORT_DETAILS_MAX} value={details} onChange={(e) => setDetails(e.target.value)}
              placeholder={t('Describe the problem in your own words.')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="report-evidence">{t('Evidence')}</Label>
            <Textarea id="report-evidence" rows={3} maxLength={REPORT_EVIDENCE_MAX} value={evidence} onChange={(e) => setEvidence(e.target.value)}
              placeholder={t('Links, quotes, dates — anything that shows what happened.')} />
            <div className="space-y-2">
              <Label htmlFor="report-files" className="flex w-fit cursor-pointer items-center gap-2 text-sm font-normal text-primary hover:underline">
                <Paperclip className="h-4 w-4" /> {t('Attach screenshots (up to {count})', { count: REPORT_MAX_FILES })}
              </Label>
              <Input id="report-files" type="file" multiple accept={REPORT_FILE_TYPES.join(',')} className="sr-only"
                disabled={files.length >= REPORT_MAX_FILES} onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
              {files.length > 0 && (
                <ul className="space-y-1">
                  {files.map((f, i) => (
                    <li key={`${f.name}-${i}`} className="flex items-center justify-between rounded-md bg-muted px-2 py-1 text-sm">
                      <span className="truncate">{f.name}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" aria-label={t('Remove')} onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {target.userId !== user.uid && !isBlocked(target.userId) && (
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={alsoBlock} onCheckedChange={(c) => setAlsoBlock(c === true)} />
              {t('Also block {name}', { name: target.userName })}
            </label>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t('Cancel')}</Button>
          <Button variant="destructive" onClick={submit} disabled={!reason || busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('Send report')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
