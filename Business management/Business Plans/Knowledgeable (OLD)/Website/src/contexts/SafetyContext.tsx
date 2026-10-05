"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { blockUser, subscribeBlocked, unblockUser } from '@/lib/data/safety';

interface SafetyContextValue {
  blocked: Set<string>;
  isBlocked: (uid: string | undefined) => boolean;
  block: (uid: string) => Promise<void>;
  unblock: (uid: string) => Promise<void>;
}

const SafetyContext = createContext<SafetyContextValue | undefined>(undefined);

/** Keeps the signed-in user's block list live, so blocked people's content disappears everywhere at once. */
export function SafetyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [blocked, setBlocked] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    return subscribeBlocked(user.uid, setBlocked);
  }, [user]);

  const block = useCallback(async (uid: string) => {
    if (user) await blockUser(user.uid, uid);
  }, [user]);
  const unblock = useCallback(async (uid: string) => {
    if (user) await unblockUser(user.uid, uid);
  }, [user]);

  const value = useMemo<SafetyContextValue>(
    () => ({ blocked, isBlocked: (uid) => Boolean(uid && blocked.has(uid)), block, unblock }),
    [blocked, block, unblock]
  );
  return <SafetyContext.Provider value={value}>{children}</SafetyContext.Provider>;
}

export function useSafety(): SafetyContextValue {
  const context = useContext(SafetyContext);
  if (!context) throw new Error('useSafety must be used within a SafetyProvider');
  return context;
}
