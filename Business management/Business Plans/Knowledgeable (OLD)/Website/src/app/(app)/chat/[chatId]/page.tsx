"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Paperclip, Send, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CardFooter, CardHeader } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/contexts/AuthContext';
import {
  CHAT_FILE_MAX_MB, CHAT_FILE_TYPES, getConversation, isAcceptedChatFile, MESSAGE_MAX_LENGTH, sendAttachment, sendMessage, subscribeMessages,
} from '@/lib/data/chat';
import { notify } from '@/lib/data/notifications';
import { AttachmentBubble } from '@/components/chat/AttachmentBubble';
import { SafetyMenu } from '@/components/safety/SafetyMenu';
import { useSafety } from '@/contexts/SafetyContext';
import { getProfile } from '@/lib/data/profiles';
import type { ChatMessage, PublicProfile } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useI18n } from '@/contexts/LanguageContext';

export default function ChatDetailPage() {
  const params = useParams();
  const router = useRouter();
  const chatId = params.chatId as string;
  const { user, profile } = useCurrentUser();
  const { toast } = useToast();
  const { t, time } = useI18n();

  const [other, setOther] = useState<PublicProfile | null | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isBlocked, unblock } = useSafety();

  useEffect(() => {
    let cancelled = false;
    getConversation(chatId)
      .then(async (convo) => {
        if (!convo || !convo.participantIds.includes(user.uid)) {
          router.replace('/chat');
          return;
        }
        const otherId = convo.participantIds.find((id) => id !== user.uid)!;
        const p = await getProfile(otherId).catch(() => null);
        if (!cancelled) setOther(p);
      })
      .catch(() => router.replace('/chat'));
    return () => {
      cancelled = true;
    };
  }, [chatId, user.uid, router]);

  useEffect(() => {
    if (other === undefined) return;
    return subscribeMessages(chatId, setMessages, () => router.replace('/chat'));
  }, [chatId, other, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newMessage.trim();
    if (!text && !file) return;
    setSending(true);
    try {
      const messageId = file ? await sendAttachment(chatId, user.uid, file, text) : await sendMessage(chatId, user.uid, text);
      setNewMessage('');
      setFile(null);
      notify({ type: 'message', conversationId: chatId, messageId });
    } catch {
      toast({
        title: t('Message not sent'),
        description: user.emailVerified ? t('Please try again.') : t('Verify your email address to send messages.'),
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const pickFile = (list: FileList | null) => {
    const picked = list?.[0];
    if (!picked) return;
    if (!isAcceptedChatFile(picked)) {
      toast({
        title: t('File not accepted'),
        description: t('Share images, PDFs, Office documents, EPUB, CSV or text files up to {size} MB.', { size: CHAT_FILE_MAX_MB }),
        variant: 'destructive',
      });
      return;
    }
    setFile(picked);
  };

  if (other === undefined) {
    return (
      <div className="flex flex-col justify-center items-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg mt-4">{t('Loading chat…')}</p>
      </div>
    );
  }

  const otherName = other?.displayName ?? t('Knowledgeable member');
  const blockedByMe = isBlocked(other?.id);

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-8.5rem)] md:max-h-[calc(100vh-5.5rem)]">
      <CardHeader className="p-4 border-b flex flex-row items-center space-x-3 sticky top-0 bg-background z-10">
        <Button variant="ghost" size="icon" onClick={() => router.push('/chat')} className="mr-2" aria-label={t('Back to chats')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-10 w-10">
          <AvatarImage src={other?.avatarUrl} alt={otherName} />
          <AvatarFallback>{otherName.substring(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        {other ? (
          <Link href={`/profile/${other.id}`} className="font-semibold hover:underline">{otherName}</Link>
        ) : (
          <p className="font-semibold">{otherName}</p>
        )}
        {other && (
          <SafetyMenu className="ml-auto" target={{ type: 'user', id: other.id, userId: other.id, userName: otherName, context: `conversations/${chatId}` }} />
        )}
      </CardHeader>

      <ScrollArea className="flex-grow p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">{t('Say hello 👋')}</p>
          )}
          {messages.map((msg) => {
            const mine = msg.senderId === user.uid;
            const avatar = mine ? profile.avatarUrl : other?.avatarUrl;
            const initial = (mine ? profile.displayName : otherName).substring(0, 1).toUpperCase();
            return (
              <div
                key={msg.id}
                className={cn("flex items-end space-x-2 max-w-[75%]", mine ? "ml-auto flex-row-reverse space-x-reverse" : "mr-auto")}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={avatar} />
                  <AvatarFallback>{initial}</AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    "p-3 rounded-lg shadow-md",
                    mine ? "bg-primary text-primary-foreground rounded-br-none" : "bg-card text-card-foreground rounded-bl-none"
                  )}
                >
                  {msg.attachment && <AttachmentBubble attachment={msg.attachment} mine={mine} />}
                  {msg.text && <p className={cn("text-sm whitespace-pre-wrap break-words", msg.attachment && "mt-1.5")}>{msg.text}</p>}
                  <p className={cn("text-xs mt-1", mine ? "text-primary-foreground/70 text-right" : "text-muted-foreground text-left")}>
                    {time(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <CardFooter className="p-4 border-t sticky bottom-0 bg-background z-10 flex-col items-stretch gap-2">
        {blockedByMe ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>{t('You blocked {name}. Unblock them to send messages.', { name: otherName })}</span>
            <Button variant="outline" size="sm" onClick={() => other && unblock(other.id)}>{t('Unblock')}</Button>
          </div>
        ) : (
        <>
        {file && (
          <div className="flex items-center gap-2 rounded-md bg-muted px-2.5 py-1.5 text-sm">
            <Paperclip className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{file.name}</span>
            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFile(null)} aria-label={t('Remove')}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        <form onSubmit={handleSendMessage} className="flex w-full space-x-2">
          <input
            ref={fileInputRef}
            type="file"
            className="sr-only"
            tabIndex={-1}
            accept={CHAT_FILE_TYPES.join(',')}
            onChange={(e) => { pickFile(e.target.files); e.target.value = ''; }}
          />
          <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={sending} aria-label={t('Share a file')}>
            <Paperclip className="h-5 w-5" />
          </Button>
          <Input
            placeholder={file ? t('Add a message (optional)…') : t('Type a message…')}
            value={newMessage}
            maxLength={MESSAGE_MAX_LENGTH}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-grow"
            autoComplete="off"
          />
          <Button type="submit" disabled={(newMessage.trim() === '' && !file) || sending}>
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            <span className="sr-only">{t('Send')}</span>
          </Button>
        </form>
        </>
        )}
      </CardFooter>
    </div>
  );
}
