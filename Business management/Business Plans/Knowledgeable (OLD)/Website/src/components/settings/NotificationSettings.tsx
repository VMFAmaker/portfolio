"use client";

import { useEffect, useState } from 'react';
import { BellRing, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/LanguageContext';
import {
  disablePush, enablePush, getNotificationPrefs, MORNING_HOURS, pushState, saveNotificationPrefs, type PushState,
} from '@/lib/data/notifications';
import type { NotificationPrefs } from '@/lib/types';

function Row({ id, title, description, checked, onChange, disabled }: {
  id: string; title: string; description: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-3 border rounded-lg">
      <div>
        <Label htmlFor={id} className="font-medium">{title}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

export function NotificationSettings() {
  const { user } = useCurrentUser();
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [device, setDevice] = useState<PushState>('unsupported');
  const [deviceBusy, setDeviceBusy] = useState(false);

  useEffect(() => {
    setDevice(pushState());
    getNotificationPrefs(user.uid, locale).then(setPrefs).catch(() => setPrefs(null));
  }, [user.uid, locale]);

  const update = async (patch: Partial<NotificationPrefs>) => {
    if (!prefs) return;
    const next = { ...prefs, ...patch, locale };
    setPrefs(next);
    try {
      await saveNotificationPrefs(user.uid, next);
    } catch {
      setPrefs(prefs);
      toast({ title: t('Could not save your notification settings'), variant: 'destructive' });
    }
  };

  const toggleDevice = async () => {
    setDeviceBusy(true);
    try {
      if (device === 'enabled') {
        await disablePush(user.uid);
        setDevice(pushState());
      } else {
        const state = await enablePush(user.uid);
        setDevice(state);
        if (state === 'denied') {
          toast({ title: t('Notifications are blocked'), description: t('Allow notifications for Knowledgeable in your browser or phone settings, then try again.') });
        }
      }
    } catch {
      toast({ title: t('Could not turn on notifications on this device'), description: t('Please try again.'), variant: 'destructive' });
    } finally {
      setDeviceBusy(false);
    }
  };

  if (!prefs) {
    return <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />;
  }

  const deviceText: Record<PushState, string> = {
    enabled: t('Push notifications are on for this device.'),
    default: t('Get notifications on this device, even when the app is closed.'),
    denied: t('Notifications are blocked for this app in your device settings.'),
    unsupported: t('This browser can’t show push notifications. Install the app to get them.'),
    unconfigured: t('Push notifications aren’t available in this test environment.'),
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 border rounded-lg">
        <div className="flex items-start gap-2">
          <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="font-medium">{t('This device')}</p>
            <p className="text-sm text-muted-foreground">{deviceText[device]}</p>
          </div>
        </div>
        {(device === 'default' || device === 'enabled') && (
          <Button size="sm" variant={device === 'enabled' ? 'outline' : 'default'} onClick={toggleDevice} disabled={deviceBusy}>
            {deviceBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {device === 'enabled' ? t('Turn off') : t('Turn on')}
          </Button>
        )}
      </div>

      <Row
        id="notify-morning"
        title={t('Morning reminder')}
        description={t('One notification a day with the ideas due for review and the book you’re reading.')}
        checked={prefs.morning}
        onChange={(v) => update({ morning: v })}
      />
      {prefs.morning && (
        <div className="flex items-center justify-between gap-4 p-3 border rounded-lg">
          <Label htmlFor="notify-hour" className="font-medium">{t('Send it at')}</Label>
          <Select value={String(prefs.morningHour)} onValueChange={(v) => update({ morningHour: Number(v) })}>
            <SelectTrigger id="notify-hour" className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MORNING_HOURS.map((h) => (
                <SelectItem key={h} value={String(h)}>{`${String(h).padStart(2, '0')}:00`}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <Row
        id="notify-activity"
        title={t('Activity')}
        description={t('Likes, comments, new followers and messages.')}
        checked={prefs.activity}
        onChange={(v) => update({ activity: v })}
      />
      <Row
        id="notify-email"
        title={t('Email when a file is shared with you')}
        description={t('We only email you when someone shares a file in a chat. Ordinary messages are app notifications only.')}
        checked={prefs.email}
        onChange={(v) => update({ email: v })}
      />
    </div>
  );
}
