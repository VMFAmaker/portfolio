"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, BookOpen, CheckCheck, Heart, Loader2, MessageCircle, MessageSquare, Paperclip, Settings, UserPlus, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useCurrentUser } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/LanguageContext';
import { useSafety } from '@/contexts/SafetyContext';
import { deleteNotification, markNotificationsRead, notificationHref, subscribeNotifications } from '@/lib/data/notifications';
import type { AppNotification, NotificationType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { describeNotification } from '@/lib/notifications/text';

const ICONS: Record<NotificationType, React.ElementType> = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
  message: MessageSquare,
  file: Paperclip,
  morning: BookOpen,
};

export default function NotificationsPage() {
  const { user } = useCurrentUser();
  const { t, relative } = useI18n();
  const { isBlocked } = useSafety();
  const [items, setItems] = useState<AppNotification[] | null>(null);

  useEffect(() => subscribeNotifications(user.uid, setItems), [user.uid]);

  const visible = items?.filter((n) => !isBlocked(n.actorId)) ?? null;
  const unreadIds = (items ?? []).filter((n) => !n.read).map((n) => n.id);

  return (
    <div className="max-w-2xl mx-auto w-full space-y-4">
      <div className="flex items-center justify-between gap-2 pt-2">
        <h1 className="text-3xl font-bold">{t('Notifications')}</h1>
        <div className="flex gap-1">
          {unreadIds.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => markNotificationsRead(user.uid, unreadIds)}>
              <CheckCheck className="mr-2 h-4 w-4" /> {t('Mark all as read')}
            </Button>
          )}
          <Button variant="ghost" size="icon" asChild>
            <Link href="/settings" aria-label={t('Notification settings')}><Settings className="h-4 w-4" /></Link>
          </Button>
        </div>
      </div>

      {visible === null ? (
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
      ) : visible.length === 0 ? (
        <Card className="py-12 text-center text-muted-foreground">
          <Bell className="mx-auto mb-3 h-10 w-10" />
          <p>{t('Nothing yet. Likes, comments, follows and messages will show up here.')}</p>
        </Card>
      ) : (
        <ul className="space-y-2">
          {visible.map((n) => {
            const Icon = ICONS[n.type];
            return (
              <li key={n.id}>
                <Card className={cn('flex items-start gap-3 p-3', !n.read && 'border-primary/40 bg-primary/5')}>
                  <Link
                    href={notificationHref(n)}
                    className="flex min-w-0 flex-1 items-start gap-3"
                    onClick={() => !n.read && markNotificationsRead(user.uid, [n.id])}
                  >
                    <div className="relative shrink-0">
                      {n.actorId ? (
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={n.actorAvatarUrl} alt={n.actorName} />
                          <AvatarFallback>{(n.actorName ?? '?').substring(0, 1).toUpperCase()}</AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                      )}
                      {n.actorId && (
                        <span className="absolute -bottom-1 -right-1 rounded-full bg-background p-0.5">
                          <Icon className="h-3.5 w-3.5 text-primary" />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm">{describeNotification(n, t)}</p>
                      {n.snippet && <p className="mt-0.5 truncate text-sm text-muted-foreground">{n.snippet}</p>}
                      <p className="mt-1 text-xs text-muted-foreground">{relative(n.createdAt)}</p>
                    </div>
                  </Link>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => deleteNotification(user.uid, n.id)} aria-label={t('Remove')}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
