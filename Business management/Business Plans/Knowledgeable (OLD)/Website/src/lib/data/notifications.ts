"use client";

import {
  collection, deleteDoc, doc, getDoc, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, where, writeBatch,
} from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { getDb } from '@/lib/firebase/client';
import { notificationFromDoc } from '@/lib/data/converters';
import type { AppNotification, NotificationPrefs } from '@/lib/types';

// ---------- in-app notifications (written by the server, read by the owner) ----------

export function subscribeNotifications(uid: string, onChange: (items: AppNotification[]) => void, max = 50) {
  return onSnapshot(
    query(collection(getDb(), 'users', uid, 'notifications'), orderBy('createdAt', 'desc'), limit(max)),
    (snap) => onChange(snap.docs.map(notificationFromDoc)),
    () => onChange([])
  );
}

export function subscribeUnreadCount(uid: string, onChange: (count: number) => void) {
  return onSnapshot(
    query(collection(getDb(), 'users', uid, 'notifications'), where('read', '==', false), limit(100)),
    (snap) => onChange(snap.size),
    () => onChange(0)
  );
}

export async function markNotificationsRead(uid: string, ids: string[]): Promise<void> {
  const db = getDb();
  for (let i = 0; i < ids.length; i += 400) {
    const batch = writeBatch(db);
    for (const id of ids.slice(i, i + 400)) batch.update(doc(db, 'users', uid, 'notifications', id), { read: true });
    await batch.commit();
  }
}

export async function deleteNotification(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(getDb(), 'users', uid, 'notifications', id));
}

export { notificationHref } from '@/lib/notifications/text';

// ---------- preferences ----------

export const MORNING_HOURS = [5, 6, 7, 8, 9, 10, 11];

export function defaultNotificationPrefs(locale: string): NotificationPrefs {
  let timezone = 'Europe/London';
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || timezone;
  } catch {
    // keep the default
  }
  return { morning: true, morningHour: 8, activity: true, email: true, timezone, locale };
}

export async function getNotificationPrefs(uid: string, locale: string): Promise<NotificationPrefs> {
  const snap = await getDoc(doc(getDb(), 'users', uid, 'private', 'notifications'));
  const defaults = defaultNotificationPrefs(locale);
  return snap.exists() ? { ...defaults, ...(snap.data() as Partial<NotificationPrefs>) } : defaults;
}

/**
 * Makes sure the server knows this person's notification settings (the morning job only sees
 * people with a settings document) and keeps their language and time zone up to date.
 */
export async function syncNotificationPrefs(uid: string, locale: string): Promise<void> {
  const snap = await getDoc(doc(getDb(), 'users', uid, 'private', 'notifications'));
  const defaults = defaultNotificationPrefs(locale);
  if (!snap.exists()) {
    await saveNotificationPrefs(uid, defaults);
    return;
  }
  const current = { ...defaults, ...(snap.data() as Partial<NotificationPrefs>) };
  if (current.locale !== locale || current.timezone !== defaults.timezone) {
    await saveNotificationPrefs(uid, { ...current, locale, timezone: defaults.timezone });
  }
}

export async function saveNotificationPrefs(uid: string, prefs: NotificationPrefs): Promise<void> {
  await setDoc(doc(getDb(), 'users', uid, 'private', 'notifications'), {
    morning: prefs.morning,
    morningHour: prefs.morningHour,
    activity: prefs.activity,
    email: prefs.email,
    timezone: prefs.timezone.slice(0, 64),
    locale: prefs.locale,
  });
}

// ---------- telling the server something happened ----------

export type NotifyEvent =
  | { type: 'like'; postId: string }
  | { type: 'comment'; postId: string; commentId: string }
  | { type: 'follow'; targetUid: string }
  | { type: 'message'; conversationId: string; messageId: string };

/**
 * Asks the server to notify the other person. The server checks that the like/comment/follow/
 * message really exists before notifying anyone, so this can't be used to spam people.
 * Fire-and-forget: a failed notification never blocks the action itself.
 */
export function notify(event: NotifyEvent): void {
  fetch('/api/notify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(event),
    keepalive: true,
  }).catch(() => undefined);
}

// ---------- push notifications on this device ----------

const DEVICE_KEY = 'knowledgeable.pushDevice';

export type PushState = 'unsupported' | 'unconfigured' | 'default' | 'denied' | 'enabled';

/** Running as an installed app (home screen / desktop install) rather than a browser tab. */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function vapidKey(): string | undefined {
  return process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || undefined;
}

export function pushState(): PushState {
  if (!pushSupported()) return 'unsupported';
  if (!vapidKey() || process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATORS === 'true') return 'unconfigured';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission === 'granted' && readStoredDevice()) return 'enabled';
  return 'default';
}

function readStoredDevice(): { uid: string; id: string } | null {
  try {
    const raw = localStorage.getItem(DEVICE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 40);
}

/**
 * Asks the browser for permission, then registers this device for push. Must be called from a
 * user gesture (a button press) — browsers ignore permission requests that aren't.
 */
export async function enablePush(uid: string): Promise<PushState> {
  const state = pushState();
  if (state === 'unsupported' || state === 'unconfigured') return state;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'default';

  const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  const { getMessaging, getToken } = await import('firebase/messaging');
  getDb(); // makes sure the Firebase app is initialised
  const token = await getToken(getMessaging(getApp()), { vapidKey: vapidKey(), serviceWorkerRegistration: registration });
  const id = await hashToken(token);
  await setDoc(doc(getDb(), 'users', uid, 'devices', id), {
    token,
    platform: isStandalone() ? 'installed' : 'browser',
    userAgent: navigator.userAgent.slice(0, 200),
    updatedAt: serverTimestamp(),
  });
  try {
    localStorage.setItem(DEVICE_KEY, JSON.stringify({ uid, id }));
  } catch {
    // push still works; we just can't remember the device id locally
  }
  return 'enabled';
}

export async function disablePush(uid: string): Promise<void> {
  const stored = readStoredDevice();
  try {
    const { deleteToken, getMessaging } = await import('firebase/messaging');
    getDb();
    await deleteToken(getMessaging(getApp()));
  } catch {
    // the token may already be gone
  }
  if (stored && stored.uid === uid) await deleteDoc(doc(getDb(), 'users', uid, 'devices', stored.id)).catch(() => undefined);
  try {
    localStorage.removeItem(DEVICE_KEY);
  } catch {
    // nothing to clean up
  }
}
