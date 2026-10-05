import { Clapperboard, Home, Library, MessageSquare, PlusSquare, Settings, UploadCloud, UserCircle, type LucideIcon } from 'lucide-react';
import { msg } from '@/lib/i18n/core';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Desktop sidebar. "My Readings" lives on the profile; feed personalisation lives in Settings. */
export function sidebarItems(profileId: string | undefined): NavItem[] {
  return [
    { href: '/', label: msg('Feed'), icon: Home },
    { href: '/reels', label: msg('Reels'), icon: Clapperboard },
    { href: '/library', label: msg('Library'), icon: Library },
    { href: '/upload', label: msg('Upload'), icon: UploadCloud },
    { href: '/chat', label: msg('Chat'), icon: MessageSquare },
    ...(profileId ? [{ href: `/profile/${profileId}`, label: msg('Profile'), icon: UserCircle }] : []),
    { href: '/settings', label: msg('Settings'), icon: Settings },
  ];
}

/** Mobile bottom bar — five thumb-reachable destinations. Chat sits in the top bar. */
export function bottomBarItems(profileId: string | undefined): NavItem[] {
  return [
    { href: '/', label: msg('Feed'), icon: Home },
    { href: '/reels', label: msg('Reels'), icon: Clapperboard },
    { href: '/upload', label: msg('Create'), icon: PlusSquare },
    { href: '/library', label: msg('Library'), icon: Library },
    { href: profileId ? `/profile/${profileId}` : '/settings', label: msg('Profile'), icon: UserCircle },
  ];
}

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || (href !== '/' && pathname.startsWith(href));
}
