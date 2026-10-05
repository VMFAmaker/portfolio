"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CurrentYear } from '@/components/CurrentYear';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/LanguageContext';
import { isActivePath, sidebarItems } from '@/components/layout/nav';

/** Desktop only — on mobile the MobileBottomNav replaces it. */
export function AppSidebar() {
  const pathname = usePathname();
  const { isMobile, state, setOpen } = useSidebar();
  const { profile } = useAuth();
  const { t } = useI18n();

  if (isMobile) return null;

  return (
    <>
      {/* The expanded sidebar floats over the page; clicking outside closes it. */}
      {state === 'expanded' && (
        <div className="fixed inset-0 z-[45] hidden bg-black/20 md:block" onClick={() => setOpen(false)} aria-hidden="true" />
      )}
      <Sidebar collapsible="icon" variant="sidebar" side="right">
        <SidebarHeader className="items-center justify-between group-data-[state=expanded]:md:flex hidden p-2 border-b border-sidebar-border">
          {profile && (
            <Link href={`/profile/${profile.id}`} className="flex items-center gap-2 min-w-0" onClick={() => setOpen(false)}>
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile.avatarUrl} alt={profile.displayName} />
                <AvatarFallback>{profile.displayName.substring(0, 1)}</AvatarFallback>
              </Avatar>
              <span className="font-semibold text-sm truncate">{profile.displayName}</span>
            </Link>
          )}
          <SidebarTrigger className="group-data-[state=expanded]:md:flex group-data-[state=collapsed]:hidden" />
        </SidebarHeader>

        <SidebarHeader className="items-center justify-center group-data-[state=collapsed]:md:flex hidden p-2 border-b border-sidebar-border">
          <SidebarTrigger />
        </SidebarHeader>

        <SidebarContent className="p-0">
          <SidebarMenu className="p-2">
            {sidebarItems(profile?.id).map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isActivePath(pathname, item.href)}
                  tooltip={{ children: t(item.label), side: 'left', align: 'start', sideOffset: 10 }}
                >
                  <Link href={item.href} onClick={() => setOpen(false)}>
                    <item.icon />
                    <span>{t(item.label)}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="group-data-[state=collapsed]:hidden p-2 border-t border-sidebar-border">
          <Separator className="my-2" />
          <p className="text-xs text-sidebar-foreground/70 text-center">
            © Knowledgeable <CurrentYear />
          </p>
        </SidebarFooter>
      </Sidebar>
    </>
  );
}
