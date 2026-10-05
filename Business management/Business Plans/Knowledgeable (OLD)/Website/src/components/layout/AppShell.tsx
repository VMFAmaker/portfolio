"use client";

import type { ReactNode } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';
import { AuthGate } from '@/components/auth/AuthGate';
import { VerifyEmailBanner } from '@/components/auth/VerifyEmailBanner';
import { MobileBottomNav } from './MobileBottomNav';
import { SafetyProvider } from '@/contexts/SafetyContext';
import { NotificationPrompt } from '@/components/notifications/NotificationPrompt';

interface AppShellProps {
  children: ReactNode;
  /** The uid verified from the session cookie on the server. */
  serverUid: string;
}

export function AppShell({ children, serverUid }: AppShellProps) {
  // When the sidebar is on the right, SidebarInset should come first in the DOM
  // for the parent flex container to correctly allocate space.
  return (
    <AuthGate serverUid={serverUid}>
      <SafetyProvider>
      {/* Starts as an icon rail; expanding it overlays the page instead of resizing it. */}
      <SidebarProvider defaultOpen={false}>
        <SidebarInset>
          <AppHeader />
          <main className="flex flex-col flex-1 p-4 sm:p-6 lg:p-8 bg-background text-foreground overflow-hidden">
            <VerifyEmailBanner />
            {children}
            <MobileBottomNav />
            <NotificationPrompt />
          </main>
        </SidebarInset>
        <AppSidebar />
      </SidebarProvider>
      </SafetyProvider>
    </AuthGate>
  );
}
