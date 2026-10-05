"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/contexts/LanguageContext';
import { useSafety } from '@/contexts/SafetyContext';
import { getProfile } from '@/lib/data/profiles';
import type { PublicProfile } from '@/lib/types';

export default function BlockedPeoplePage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { blocked, unblock } = useSafety();
  const [people, setPeople] = useState<Record<string, PublicProfile | null>>({});
  const ids = Array.from(blocked);

  useEffect(() => {
    const missing = Array.from(blocked).filter((id) => !(id in people));
    if (missing.length === 0) return;
    Promise.all(missing.map((id) => getProfile(id).catch(() => null))).then((profiles) =>
      setPeople((prev) => ({ ...prev, ...Object.fromEntries(missing.map((id, i) => [id, profiles[i]])) }))
    );
  }, [blocked, people]);

  const handleUnblock = async (id: string, name: string) => {
    try {
      await unblock(id);
      toast({ title: t('{name} is unblocked', { name }) });
    } catch {
      toast({ title: t('Could not unblock'), description: t('Please try again.'), variant: 'destructive' });
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full space-y-6 py-8">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/settings"><ArrowLeft className="mr-2 h-4 w-4" /> {t('Settings')}</Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>{t('Blocked people')}</CardTitle>
          <CardDescription>
            {t('People you block can’t message you, comment on your posts or follow you, and you won’t see their posts. They aren’t told.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {ids.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground flex items-center justify-center gap-2">
              <ShieldCheck className="h-5 w-5" /> {t('You haven’t blocked anyone.')}
            </p>
          ) : (
            ids.map((id) => {
              const person = people[id];
              if (person === undefined) return <Loader2 key={id} className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />;
              const name = person?.displayName ?? t('Knowledgeable member');
              return (
                <div key={id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={person?.avatarUrl} alt={name} />
                    <AvatarFallback>{name.substring(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{name}</p>
                    {person && <p className="text-sm text-muted-foreground truncate">@{person.handle}</p>}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleUnblock(id, name)}>{t('Unblock')}</Button>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
