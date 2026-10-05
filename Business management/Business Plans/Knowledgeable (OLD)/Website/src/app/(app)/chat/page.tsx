"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, MessageSquarePlus, Search, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/contexts/AuthContext';
import { ensureConversation, subscribeConversations } from '@/lib/data/chat';
import { getProfile, searchProfiles } from '@/lib/data/profiles';
import type { Conversation, PublicProfile } from '@/lib/types';
import { useI18n } from '@/contexts/LanguageContext';
import { useSafety } from '@/contexts/SafetyContext';

function NewChatDialog() {
  const { user } = useCurrentUser();
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<PublicProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const { isBlocked } = useSafety();

  useEffect(() => {
    if (term.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      searchProfiles(term)
        .then((r) => setResults(r.filter((p) => p.id !== user.uid && !isBlocked(p.id))))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [term, user.uid, isBlocked]);

  const start = async (other: PublicProfile) => {
    try {
      const id = await ensureConversation(user.uid, other.id);
      router.push(`/chat/${id}`);
    } catch {
      toast({
        title: t('Could not start a chat'),
        description: user.emailVerified ? t('Please try again.') : t('Verify your email address to send messages.'),
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <MessageSquarePlus className="mr-2 h-4 w-4" /> {t('New chat')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('New chat')}</DialogTitle>
          <DialogDescription>{t('Search by name or @handle.')}</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input autoFocus value={term} onChange={(e) => setTerm(e.target.value)} placeholder={t('Search people')} className="pl-9" />
        </div>
        <div className="max-h-72 overflow-y-auto space-y-1">
          {searching && <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />}
          {!searching && term.trim().length >= 2 && results.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">{t('No one found.')}</p>
          )}
          {results.map((p) => (
            <button key={p.id} type="button" onClick={() => start(p)} className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-muted">
              <Avatar className="h-9 w-9">
                <AvatarImage src={p.avatarUrl} alt={p.displayName} />
                <AvatarFallback>{p.displayName.substring(0, 1)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold">{p.displayName}</p>
                <p className="text-xs text-muted-foreground">@{p.handle}</p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ChatListPage() {
  const { user } = useCurrentUser();
  const { t, relative } = useI18n();
  const [allConversations, setConversations] = useState<Conversation[] | null>(null);
  const [people, setPeople] = useState<Record<string, PublicProfile | null>>({});
  const { isBlocked } = useSafety();

  // Conversations with people you've blocked are hidden (unblock from Settings to see them again).
  const conversations = allConversations?.filter((c) => !c.participantIds.some((id) => id !== user.uid && isBlocked(id))) ?? null;

  useEffect(() => subscribeConversations(user.uid, setConversations, () => setConversations([])), [user.uid]);

  useEffect(() => {
    const missing = (allConversations ?? [])
      .map((c) => c.participantIds.find((id) => id !== user.uid))
      .filter((id): id is string => Boolean(id) && !(id! in people));
    if (missing.length === 0) return;
    Promise.all(missing.map((id) => getProfile(id).catch(() => null))).then((profiles) =>
      setPeople((prev) => ({ ...prev, ...Object.fromEntries(missing.map((id, i) => [id, profiles[i]])) }))
    );
  }, [allConversations, people, user.uid]);

  if (conversations === null) {
    return (
      <div className="flex flex-col justify-center items-center flex-grow">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg mt-4">{t('Loading conversations…')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto w-full">
      <div className="flex justify-between items-center mb-6 pt-2">
        <h1 className="text-3xl font-bold">{t('Chats')}</h1>
        <NewChatDialog />
      </div>

      {conversations.length === 0 ? (
        <Card className="text-center py-10 flex-grow flex flex-col items-center justify-center">
          <CardContent className="flex flex-col items-center gap-4">
            <Users className="w-16 h-16 text-muted-foreground" />
            <p className="text-xl text-muted-foreground">{t('No conversations yet.')}</p>
            <p className="text-sm text-muted-foreground">{t('Start a new chat to connect with others.')}</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="flex-grow">
          <div className="space-y-3 pr-3">
            {conversations.map((convo) => {
              const otherId = convo.participantIds.find((id) => id !== user.uid) ?? '';
              const other = people[otherId];
              const name = other?.displayName ?? t('Knowledgeable member');
              return (
                <Link href={`/chat/${convo.id}`} key={convo.id} className="block">
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                    <CardContent className="p-4 flex items-center space-x-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={other?.avatarUrl} alt={name} />
                        <AvatarFallback>{name.substring(0, 1).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-grow overflow-hidden">
                        <div className="flex justify-between items-center gap-2">
                          <p className="font-semibold truncate">{name}</p>
                          {convo.lastMessage && (
                            <p className="text-xs text-muted-foreground whitespace-nowrap">
                              {relative(convo.lastMessage.createdAt)}
                            </p>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {convo.lastMessage ? `${convo.lastMessage.senderId === user.uid ? `${t('You')}: ` : ''}${convo.lastMessage.text}` : t('No messages yet')}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
