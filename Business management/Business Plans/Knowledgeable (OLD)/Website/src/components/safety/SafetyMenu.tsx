"use client";

import { useState } from 'react';
import { Ban, Flag, MoreHorizontal, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/LanguageContext';
import { msg } from '@/lib/i18n/core';
import { useSafety } from '@/contexts/SafetyContext';
import { ReportDialog, type ReportTarget } from '@/components/safety/ReportDialog';
import { cn } from '@/lib/utils';

const REPORT_LABELS = {
  user: msg('Report {name}'),
  post: msg('Report post'),
  comment: msg('Report comment'),
  message: msg('Report message'),
};

/** "…" menu with Report and Block/Unblock, used on profiles, posts, comments and chats. */
export function SafetyMenu({ target, className, size = 'icon' }: { target: ReportTarget; className?: string; size?: 'icon' | 'sm' }) {
  const { user } = useCurrentUser();
  const { t } = useI18n();
  const { toast } = useToast();
  const { isBlocked, block, unblock } = useSafety();
  const [reportOpen, setReportOpen] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);

  if (target.userId === user.uid) return null;
  const blocked = isBlocked(target.userId);

  const doBlock = async () => {
    try {
      await block(target.userId);
      toast({ title: t('{name} is blocked', { name: target.userName }), description: t('You can unblock them any time in Settings.') });
    } catch {
      toast({ title: t('Could not block'), description: t('Please try again.'), variant: 'destructive' });
    }
  };

  const doUnblock = async () => {
    try {
      await unblock(target.userId);
      toast({ title: t('{name} is unblocked', { name: target.userName }) });
    } catch {
      toast({ title: t('Could not unblock'), description: t('Please try again.'), variant: 'destructive' });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size={size === 'icon' ? 'icon' : 'sm'} className={cn(size === 'icon' && 'h-8 w-8', className)} aria-label={t('More options')}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setReportOpen(true)}>
            <Flag className="mr-2 h-4 w-4" /> {t(REPORT_LABELS[target.type], { name: target.userName })}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {blocked ? (
            <DropdownMenuItem onClick={doUnblock}>
              <ShieldCheck className="mr-2 h-4 w-4" /> {t('Unblock {name}', { name: target.userName })}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => setConfirmBlock(true)} className="text-destructive focus:text-destructive">
              <Ban className="mr-2 h-4 w-4" /> {t('Block {name}', { name: target.userName })}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ReportDialog target={target} open={reportOpen} onOpenChange={setReportOpen} />

      <AlertDialog open={confirmBlock} onOpenChange={setConfirmBlock}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Block {name}?', { name: target.userName })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('They won’t be able to message you, comment on your posts or follow you, and you won’t see their posts. They aren’t told that you blocked them.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={doBlock}>{t('Block')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
