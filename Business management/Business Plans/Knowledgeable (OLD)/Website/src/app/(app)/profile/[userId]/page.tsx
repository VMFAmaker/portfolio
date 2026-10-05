"use client";

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Ban, Bookmark, BookCheck, BookOpen, Check, ListChecks, Loader2, Lock, MessageSquare, Pencil, UploadCloud, UserPlus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostCard } from '@/components/posts/PostCard';
import { BookTile } from '@/components/books/BookTile';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/LanguageContext';
import { getFollowCounts, getProfile, isFollowing as fetchIsFollowing, setFollowing } from '@/lib/data/profiles';
import { listPostsByAuthor, listSaved } from '@/lib/data/posts';
import { getLibrary } from '@/lib/data/library';
import { ensureConversation } from '@/lib/data/chat';
import { msg } from '@/lib/i18n/core';
import { notify } from '@/lib/data/notifications';
import { SafetyMenu } from '@/components/safety/SafetyMenu';
import { useSafety } from '@/contexts/SafetyContext';
import type { LibraryEntry, Post, PublicProfile } from '@/lib/types';

function BookGrid({ entries, empty, showProgress }: { entries: LibraryEntry[]; empty: string; showProgress?: boolean }) {
  if (entries.length === 0) return <p className="text-muted-foreground text-center py-4">{empty}</p>;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-4">
      {entries.map((e) => (
        <BookTile
          key={e.bookId}
          bookId={e.bookId}
          title={e.bookTitle}
          author={e.bookAuthor}
          coverUrl={e.bookCoverUrl}
          progress={showProgress ? e.progress : undefined}
          finishedInApp={e.status === 'finished' && e.finishedInApp}
        />
      ))}
    </div>
  );
}

const TAB_VALUES = ['uploads', 'polls', 'saved', 'reading', 'read'] as const;
type TabValue = (typeof TAB_VALUES)[number];

function UserProfile() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const userId = params.userId as string;
  const { user: me } = useCurrentUser();
  const { t, topic, monthYear } = useI18n();
  const { toast } = useToast();
  const isOwnProfile = userId === me.uid;
  const requestedTab = searchParams.get('tab') as TabValue | null;
  const [tab, setTab] = useState<TabValue>(requestedTab && TAB_VALUES.includes(requestedTab) ? requestedTab : 'uploads');

  const [profile, setProfile] = useState<PublicProfile | null | undefined>(undefined);
  const [posts, setPosts] = useState<Post[]>([]);
  const [library, setLibrary] = useState<LibraryEntry[] | 'private'>([]);
  const [saved, setSaved] = useState<Post[] | null>(null);
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const [following, setFollowingState] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const { isBlocked, unblock } = useSafety();
  const blocked = !isOwnProfile && isBlocked(userId);

  useEffect(() => {
    let cancelled = false;
    setProfile(undefined);
    (async () => {
      const p = await getProfile(userId);
      if (cancelled) return;
      setProfile(p);
      if (!p) return;
      const [authored, followCounts, amFollowing, lib] = await Promise.all([
        listPostsByAuthor(userId),
        getFollowCounts(userId),
        isOwnProfile ? Promise.resolve(false) : fetchIsFollowing(me.uid, userId),
        getLibrary(userId).catch(() => 'private' as const),
      ]);
      if (cancelled) return;
      setPosts(authored);
      setCounts(followCounts);
      setFollowingState(amFollowing);
      setLibrary(lib);
    })().catch(() => !cancelled && setProfile(null));
    return () => {
      cancelled = true;
    };
  }, [userId, me.uid, isOwnProfile]);

  // Blocking removes the follow edges in both directions, so reflect that straight away.
  useEffect(() => {
    if (!blocked) return;
    setFollowingState(false);
    getFollowCounts(userId).then(setCounts).catch(() => undefined);
  }, [blocked, userId]);

  useEffect(() => {
    if (tab !== 'saved' || saved !== null || !isOwnProfile) return;
    listSaved(me.uid).then((r) => setSaved(r.posts)).catch(() => setSaved([]));
  }, [tab, saved, isOwnProfile, me.uid]);

  const handleFollowToggle = async () => {
    const next = !following;
    setFollowBusy(true);
    try {
      await setFollowing(me.uid, userId, next);
      setFollowingState(next);
      setCounts((c) => ({ ...c, followers: c.followers + (next ? 1 : -1) }));
      if (next) notify({ type: 'follow', targetUid: userId });
    } catch {
      toast({ title: t('Could not update follow'), variant: 'destructive' });
    } finally {
      setFollowBusy(false);
    }
  };

  const handleMessage = async () => {
    try {
      const convoId = await ensureConversation(me.uid, userId);
      router.push(`/chat/${convoId}`);
    } catch {
      toast({
        title: t('Could not start a chat'),
        description: me.emailVerified ? t('Please try again.') : t('Verify your email address to send messages.'),
        variant: 'destructive',
      });
    }
  };

  if (profile === undefined) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  if (!profile) {
    return <div className="text-center py-10"><p className="text-xl text-destructive">{t('User not found.')}</p></div>;
  }

  const uploads = posts.filter((p) => p.type !== 'poll');
  const polls = posts.filter((p) => p.type === 'poll');
  const entries = library === 'private' ? [] : library;
  const reading = entries.filter((e) => e.status === 'reading');
  const wantToRead = entries.filter((e) => e.status === 'want');
  const read = entries.filter((e) => e.status === 'finished');

  const tabs: { value: TabValue; label: string; icon: React.ElementType }[] = [
    { value: 'uploads', label: msg('Posts'), icon: UploadCloud },
    { value: 'polls', label: isOwnProfile ? msg('My polls') : msg('Polls'), icon: ListChecks },
    ...(isOwnProfile ? [{ value: 'saved' as const, label: msg('Saved'), icon: Bookmark }] : []),
    { value: 'reading', label: msg('Reading'), icon: BookOpen },
    { value: 'read', label: msg('Read'), icon: BookCheck },
  ];

  const privateNotice = (
    <p className="text-muted-foreground text-center py-4 flex items-center justify-center gap-2">
      <Lock className="h-4 w-4" /> {t('{name} keeps their reading lists private.', { name: profile.displayName })}
    </p>
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      <Card className="overflow-hidden shadow-lg">
        <div className="h-24 sm:h-48 bg-gradient-to-r from-primary/40 via-secondary to-primary/20" />
        <CardContent className="p-4 sm:p-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-end -mt-10 sm:-mt-16 space-y-3 sm:space-y-0">
            <Avatar className="h-20 w-20 sm:h-32 sm:w-32 border-4 border-background rounded-full shadow-md">
              <AvatarImage src={profile.avatarUrl} alt={profile.displayName} />
              <AvatarFallback className="text-2xl sm:text-4xl">{profile.displayName.substring(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="sm:ml-4 mt-3 sm:mt-0 text-center sm:text-left flex-grow">
              <h1 className="text-xl sm:text-3xl font-bold">{profile.displayName}</h1>
              <p className="text-muted-foreground text-xs sm:text-sm">
                @{profile.handle} · {t('joined {date}', { date: monthYear(profile.createdAt) })}
              </p>
              <p className="text-muted-foreground text-xs sm:text-sm mt-1">{profile.bio || t('No bio yet.')}</p>
            </div>
            <div className="flex gap-2 mt-3 sm:mt-0 sm:ml-auto shrink-0 w-full sm:w-auto">
              {isOwnProfile ? (
                <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
                  <Link href="/settings/account-details"><Pencil className="mr-2 h-4 w-4" /> {t('Edit profile')}</Link>
                </Button>
              ) : blocked ? (
                <>
                  <Button onClick={() => unblock(userId)} variant="outline" size="sm" className="flex-1 sm:flex-none">
                    <Ban className="mr-2 h-4 w-4" /> {t('Unblock')}
                  </Button>
                  <SafetyMenu target={{ type: 'user', id: userId, userId, userName: profile.displayName }} />
                </>
              ) : (
                <>
                  <Button onClick={handleFollowToggle} disabled={followBusy} variant={following ? "secondary" : "default"} size="sm" className="flex-1 sm:flex-none">
                    {following ? <Check className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
                    {following ? t('Following') : t('Follow')}
                  </Button>
                  <Button onClick={handleMessage} variant="outline" size="sm" className="flex-1 sm:flex-none">
                    <MessageSquare className="mr-2 h-4 w-4" /> {t('Message')}
                  </Button>
                  <SafetyMenu target={{ type: 'user', id: userId, userId, userName: profile.displayName }} />
                </>
              )}
            </div>
          </div>
          <div className="mt-4 sm:mt-6 flex flex-wrap gap-x-6 gap-y-2 justify-center sm:justify-start text-sm">
            <div><span className="font-semibold">{counts.following}</span> <span className="text-muted-foreground">{t('Following')}</span></div>
            <div><span className="font-semibold">{counts.followers}</span> <span className="text-muted-foreground">{t('Followers')}</span></div>
            {library !== 'private' && (
              <div><span className="font-semibold">{read.length}</span> <span className="text-muted-foreground">{t('Books read')}</span></div>
            )}
          </div>
          {profile.interests.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1 justify-center sm:justify-start">
              {profile.interests.slice(0, 8).map((id) => (
                <Link key={id} href={`/category/${id}`}><Badge variant="outline">{topic(id)}</Badge></Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {blocked ? (
        <p className="text-muted-foreground text-center py-6">
          {t('You blocked {name}. Their posts and reading are hidden from you.', { name: profile.displayName })}
        </p>
      ) : (
      <Tabs value={tab} className="w-full" onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList className="flex w-full mb-4 sm:mb-6 px-1">
          {tabs.map((item) => (
            <TabsTrigger
              key={item.value}
              value={item.value}
              className="flex-1 text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2 md:py-2.5 flex items-center justify-center gap-1.5"
            >
              <item.icon className="h-4 w-4 md:hidden" />
              <span className="hidden md:inline">{t(item.label)}</span>
              <span className="sr-only md:hidden">{t(item.label)}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="uploads" className="space-y-4 sm:space-y-6">
          {uploads.length > 0
            ? uploads.map((post) => <PostCard key={post.id} post={post} />)
            : <p className="text-muted-foreground text-center py-4">{t('No posts yet.')}</p>}
        </TabsContent>
        <TabsContent value="polls" className="space-y-4 sm:space-y-6">
          {polls.length > 0
            ? polls.map((post) => <PostCard key={post.id} post={post} />)
            : <p className="text-muted-foreground text-center py-4">{t('No polls created yet.')}</p>}
        </TabsContent>
        {isOwnProfile && (
          <TabsContent value="saved" className="space-y-4 sm:space-y-6">
            {saved === null ? (
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            ) : saved.length > 0 ? (
              saved.map((post) => <PostCard key={`saved-${post.id}`} post={post} />)
            ) : (
              <div className="text-center py-10">
                <Bookmark className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground" />
                <p className="mt-4 text-md sm:text-xl text-muted-foreground">{t('No saved items yet.')}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">{t('Saved posts come back in your feed over time so they stick. Only you can see this tab.')}</p>
              </div>
            )}
          </TabsContent>
        )}
        <TabsContent value="reading" className="space-y-8">
          {library === 'private' ? privateNotice : (
            <>
              <section className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /> {t('Currently reading')}</h2>
                <BookGrid entries={reading} empty={t('Not currently reading any books.')} showProgress />
              </section>
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">{t('Want to read')}</h2>
                <BookGrid entries={wantToRead} empty={t('Nothing on the list yet.')} />
              </section>
              {isOwnProfile && (
                <Button variant="outline" asChild>
                  <Link href="/library">{t('Browse the library')}</Link>
                </Button>
              )}
            </>
          )}
        </TabsContent>
        <TabsContent value="read">
          {library === 'private' ? privateNotice : <BookGrid entries={read} empty={t('No finished books yet.')} />}
        </TabsContent>
      </Tabs>
      )}
    </div>
  );
}

export default function UserProfilePage() {
  return (
    <Suspense>
      <UserProfile />
    </Suspense>
  );
}
