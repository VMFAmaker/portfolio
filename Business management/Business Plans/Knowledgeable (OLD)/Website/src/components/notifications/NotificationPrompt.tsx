"use client";

import { useEffect, useState } from 'react';
import { BellRing, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/LanguageContext';
import { enablePush, isStandalone, pushState, syncNotificationPrefs } from '@/lib/data/notifications';

const DISMISSED_KEY = 'knowledgeable.pushPromptDismissed';

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * The first time someone opens the installed app on a device, ask whether they want push
 * notifications. Browsers only allow the permission request after a tap, so this is a card with
 * a button rather than an automatic prompt. Also keeps the language and time zone used for
 * notifications in step with the device.
 */
export function NotificationPrompt() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setShow(isStandalone() && pushState() === 'default' && !wasDismissed());
  }, [user]);

  // Morning reminders are sent in the reader's language at their local hour.
  useEffect(() => {
    if (!user) return;
    syncNotificationPrefs(user.uid, locale).catch(() => undefined);
  }, [user, locale]);

  if (!show || !user) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // it will simply ask again next time
    }
    setShow(false);
  };

  const accept = async () => {
    setBusy(true);
    try {
      await enablePush(user.uid);
    } catch {
      // they can try again from Settings → Notifications
    } finally {
      setBusy(false);
      dismiss();
    }
  };

  return (
    <Card
      role="dialog"
      aria-label={t('Turn on notifications')}
      className="fixed inset-x-4 bottom-20 z-50 mx-auto max-w-md p-4 shadow-xl md:bottom-6"
    >
      <div className="flex items-start gap-3">
        <BellRing className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
        <div className="space-y-3">
          <div>
            <p className="font-semibold">{t('Turn on notifications?')}</p>
            <p className="text-sm text-muted-foreground">
              {t('A short morning reminder, plus likes, comments, follows and messages. You can change this any time in Settings.')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={accept} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('Turn on')}
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>{t('Not now')}</Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
