"use client";

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AppLogo } from '@/components/AppLogo';
import { SearchInput } from '@/components/SearchInput';
import { User, Settings, LogOut, UploadCloud, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/LanguageContext';
import { NotificationBell } from '@/components/notifications/NotificationBell';

export function AppHeader() {
  const { user, profile, signOut } = useAuth();
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <AppLogo />
        </div>

        <div className="hidden md:flex flex-1 justify-center px-8">
          <SearchInput className="max-w-md" />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {profile && <NotificationBell />}
          {/* On phones Chat lives up here, Instagram-style; the bottom bar holds the rest. */}
          <Button variant="ghost" size="icon" asChild className="md:hidden">
            <Link href="/chat" aria-label={t('Chat')}>
              <MessageSquare className="h-6 w-6" />
            </Link>
          </Button>
          {profile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full" aria-label={t('Account menu')}>
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={profile.avatarUrl} alt={profile.displayName} />
                    <AvatarFallback>{profile.displayName.substring(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{profile.displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.email ?? `@${profile.handle}`}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/profile/${profile.id}`}>
                    <User className="mr-2 h-4 w-4" />
                    {t('Profile')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/upload">
                    <UploadCloud className="mr-2 h-4 w-4" />
                    {t('Upload content')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    {t('Settings')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void signOut()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('Log out')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      <div className="md:hidden border-t p-2">
        <SearchInput />
      </div>
    </header>
  );
}
