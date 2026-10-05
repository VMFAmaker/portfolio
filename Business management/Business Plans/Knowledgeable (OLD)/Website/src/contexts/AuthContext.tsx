"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onIdTokenChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { getDb, getFirebaseAuth } from '@/lib/firebase/client';
import { profileFromDoc } from '@/lib/data/converters';
import type { PublicProfile } from '@/lib/types';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  /** undefined while loading, null when the user hasn't finished onboarding. */
  profile: PublicProfile | null | undefined;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (displayName: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: (options?: { everywhere?: boolean }) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  /** Re-reads the user (e.g. after clicking the verification link) and refreshes the session. */
  refreshVerification: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function createServerSession(user: User, forceRefresh = false) {
  const idToken = await user.getIdToken(forceRefresh);
  const res = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`session:${body.error ?? res.status}`);
  }
}

async function clearServerSession(everywhere = false) {
  await fetch('/api/auth/session', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ everywhere }),
  }).catch(() => undefined);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PublicProfile | null | undefined>(undefined);

  useEffect(() => {
    const auth = getFirebaseAuth();
    return onIdTokenChanged(auth, (nextUser) => {
      setUser(nextUser);
      setStatus(nextUser ? 'authenticated' : 'unauthenticated');
      if (!nextUser) setProfile(null);
    });
  }, []);

  // Live profile subscription for the signed-in user.
  useEffect(() => {
    if (!user) return;
    setProfile(undefined);
    return onSnapshot(
      doc(getDb(), 'users', user.uid),
      (snap) => setProfile(snap.exists() ? profileFromDoc(snap) : null),
      () => setProfile(null)
    );
  }, [user]);

  const signIn = useCallback(async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
    try {
      await createServerSession(cred.user);
    } catch (error) {
      await firebaseSignOut(getFirebaseAuth());
      throw error;
    }
  }, []);

  const signUp = useCallback(async (displayName: string, email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
    await updateProfile(cred.user, { displayName });
    await sendEmailVerification(cred.user).catch(() => undefined);
    await createServerSession(cred.user);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await signInWithPopup(getFirebaseAuth(), provider);
    try {
      await createServerSession(cred.user);
    } catch (error) {
      await firebaseSignOut(getFirebaseAuth());
      throw error;
    }
  }, []);

  const signOut = useCallback(async (options?: { everywhere?: boolean }) => {
    await clearServerSession(options?.everywhere === true);
    await firebaseSignOut(getFirebaseAuth());
    // Full navigation so no signed-in UI or cached server components survive.
    window.location.assign('/login');
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), email);
    } catch (error) {
      // Don't reveal whether the address has an account; only surface rate limiting / network issues.
      const code = (error as { code?: string }).code;
      if (code === 'auth/too-many-requests' || code === 'auth/network-request-failed') throw error;
    }
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    const current = getFirebaseAuth().currentUser;
    if (current) await sendEmailVerification(current);
  }, []);

  const refreshVerification = useCallback(async () => {
    const current = getFirebaseAuth().currentUser;
    if (!current) return false;
    await current.reload();
    if (!current.emailVerified) return false;
    // New token carries email_verified=true; refresh the server session so it does too.
    await createServerSession(current, true);
    setUser(getFirebaseAuth().currentUser);
    return true;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      profile,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      sendPasswordReset,
      resendVerificationEmail,
      refreshVerification,
    }),
    [status, user, profile, signIn, signUp, signInWithGoogle, signOut, sendPasswordReset, resendVerificationEmail, refreshVerification]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

/**
 * For pages inside the signed-in app shell, where AuthGate guarantees a user and profile.
 * Throws if used elsewhere so mistakes surface immediately.
 */
export function useCurrentUser(): { user: User; profile: PublicProfile } {
  const { user, profile } = useAuth();
  if (!user || !profile) throw new Error('useCurrentUser used outside the signed-in app shell');
  return { user, profile };
}
