import 'server-only';

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminAuth, adminDb, adminMessaging, usingEmulators } from '@/lib/firebase/admin';
import { isLocale, translate, type Locale } from '@/lib/i18n/core';
import { describeNotification, notificationHref } from '@/lib/notifications/text';
import type { NotificationPrefs, NotificationType } from '@/lib/types';

export const DEFAULT_PREFS: NotificationPrefs = {
  morning: true,
  morningHour: 8,
  activity: true,
  email: true,
  timezone: 'Europe/London',
  locale: 'en-GB',
};

export async function getPrefs(uid: string): Promise<NotificationPrefs> {
  const snap = await adminDb().doc(`users/${uid}/private/notifications`).get();
  return { ...DEFAULT_PREFS, ...(snap.exists ? (snap.data() as Partial<NotificationPrefs>) : {}) };
}

export interface NotificationInput {
  type: NotificationType;
  actorId?: string;
  postId?: string;
  postTitle?: string;
  conversationId?: string;
  snippet?: string;
  dueCount?: number;
  bookId?: string;
  bookTitle?: string;
}

function localeOf(prefs: NotificationPrefs): Locale {
  return isLocale(prefs.locale) ? prefs.locale : 'en-GB';
}

function appUrl(path: string): string {
  const base = (process.env.APP_URL ?? 'http://localhost:9002').replace(/\/+$/, '');
  return `${base}${path}`;
}

/**
 * Records a notification for `recipient` and, if their settings allow it, pushes it to their
 * devices. `docId` makes repeats collapse into one (liking, unliking and liking again doesn't
 * notify three times). Returns false when nothing was recorded.
 */
export async function deliver(recipient: string, input: NotificationInput, docId: string): Promise<boolean> {
  const db = adminDb();
  if (input.actorId) {
    if (input.actorId === recipient) return false;
    // People you've blocked can't reach you, even indirectly.
    const blocked = await db.doc(`users/${recipient}/blocked/${input.actorId}`).get();
    if (blocked.exists) return false;
  }

  // Chat notifications are replaced by the latest message; everything else is sent only once.
  const ref = db.doc(`users/${recipient}/notifications/${docId}`);
  if (input.type !== 'message' && (await ref.get()).exists) return false;

  const prefs = await getPrefs(recipient);
  const locale = localeOf(prefs);
  const t = (text: string, vars?: Record<string, string | number>) => translate(locale, text, vars);

  let actorName: string | undefined;
  let actorAvatarUrl: string | undefined;
  if (input.actorId) {
    const actor = await db.doc(`users/${input.actorId}`).get();
    actorName = actor.get('displayName') ?? undefined;
    actorAvatarUrl = actor.get('avatarUrl') ?? undefined;
  }

  const record: Record<string, unknown> = { type: input.type, read: false, createdAt: FieldValue.serverTimestamp() };
  for (const [key, value] of Object.entries({ ...input, actorName, actorAvatarUrl })) {
    if (value !== undefined && key !== 'type') record[key] = typeof value === 'string' ? value.slice(0, 300) : value;
  }
  await ref.set(record);

  const wantsPush = input.type === 'morning' ? prefs.morning : prefs.activity;
  if (wantsPush) {
    const body = describeNotification({ ...input, actorName }, t);
    await pushToDevices(recipient, {
      title: 'Knowledgeable',
      body: input.snippet && (input.type === 'message' || input.type === 'comment') ? `${body}: ${input.snippet}` : body,
      link: notificationHref(input),
      tag: docId,
    });
  }

  // Email only for shared files — ordinary messages are app notifications only.
  if (input.type === 'file' && prefs.email) {
    await queueFileEmail(recipient, actorName ?? t('Someone'), input, t);
  }
  return true;
}

async function pushToDevices(uid: string, data: { title: string; body: string; link: string; tag: string }) {
  const devices = await adminDb().collection(`users/${uid}/devices`).limit(10).get();
  if (devices.empty) return;
  if (usingEmulators()) {
    console.info('[notify] emulator mode — push not sent', { uid, devices: devices.size, title: data.title });
    return;
  }
  const tokens = devices.docs.map((d) => d.get('token') as string).filter(Boolean);
  // Data-only messages: public/sw.js draws the notification, so it looks the same everywhere.
  const result = await adminMessaging().sendEachForMulticast({
    tokens,
    data,
    webpush: { headers: { Urgency: 'normal', TTL: String(60 * 60 * 24) } },
  });
  // Forget devices that uninstalled the app or revoked permission.
  const stale = result.responses
    .map((r, i) => (!r.success && ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token']
      .includes(r.error?.code ?? '') ? devices.docs[i].ref : null))
    .filter((ref): ref is FirebaseFirestore.DocumentReference => ref !== null);
  await Promise.all(stale.map((ref) => ref.delete()));
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/**
 * Queues an email through the Firebase "Trigger Email" extension, which sends every document
 * added to the `mail` collection. The email links back to the chat; the file itself is never
 * attached or linked publicly — the recipient opens it in the app.
 */
async function queueFileEmail(
  recipient: string,
  actorName: string,
  input: NotificationInput,
  t: (text: string, vars?: Record<string, string | number>) => string
) {
  const user = await adminAuth().getUser(recipient).catch(() => null);
  if (!user?.email || !user.emailVerified) return;
  const link = appUrl(notificationHref(input));
  const subject = t('{name} shared a file with you', { name: actorName });
  const fileLine = input.snippet ? t('File: {name}', { name: input.snippet }) : '';
  const cta = t('Open the chat');
  const footer = t('You get this email because file-sharing emails are on. Turn them off in Settings → Notifications.');
  await adminDb().collection('mail').add({
    to: user.email,
    message: {
      subject,
      text: [subject, fileLine, `${cta}: ${link}`, '', footer].filter((l) => l !== undefined).join('\n'),
      html: `<p>${escapeHtml(subject)}</p>${fileLine ? `<p>${escapeHtml(fileLine)}</p>` : ''}`
        + `<p><a href="${escapeHtml(link)}">${escapeHtml(cta)}</a></p><p style="color:#666;font-size:12px">${escapeHtml(footer)}</p>`,
    },
    createdAt: FieldValue.serverTimestamp(),
  });
}

// ---------- morning reminder ----------

function localParts(timezone: string, now: Date): { hour: number; date: string } {
  let tz = timezone;
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: tz });
  } catch {
    tz = 'Europe/London';
  }
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return { hour: Number(get('hour')), date: `${get('year')}-${get('month')}-${get('day')}` };
}

/**
 * Sends today's morning reminder to everyone whose chosen local hour is now. Meant to run every
 * hour (Cloud Scheduler → /api/cron/morning). Each person gets at most one per local day.
 */
export async function sendMorningReminders(now = new Date()): Promise<{ checked: number; sent: number }> {
  const db = adminDb();
  const snap = await db.collectionGroup('private').where('morning', '==', true).get();
  let sent = 0;
  for (const prefDoc of snap.docs) {
    if (prefDoc.id !== 'notifications') continue;
    const uid = prefDoc.ref.parent.parent?.id;
    if (!uid) continue;
    const prefs = { ...DEFAULT_PREFS, ...(prefDoc.data() as Partial<NotificationPrefs>) };
    const { hour, date } = localParts(prefs.timezone, now);
    if (hour !== prefs.morningHour) continue;

    const docId = `morning_${date}`;
    if ((await db.doc(`users/${uid}/notifications/${docId}`).get()).exists) continue;

    const [due, reading] = await Promise.all([
      db.collection(`users/${uid}/saved`).where('nextReviewAt', '<=', Timestamp.fromDate(now)).count().get(),
      db.collection(`users/${uid}/library`).where('status', '==', 'reading').limit(20).get(),
    ]);
    const current = reading.docs
      .sort((a, b) => (b.get('updatedAt')?.toMillis?.() ?? 0) - (a.get('updatedAt')?.toMillis?.() ?? 0))[0];
    const input: NotificationInput = { type: 'morning' };
    const dueCount = due.data().count;
    if (dueCount > 0) input.dueCount = dueCount;
    if (current) {
      input.bookId = current.id;
      input.bookTitle = current.get('bookTitle');
    }
    try {
      if (await deliver(uid, input, docId)) sent += 1;
    } catch (error) {
      console.error('[notify] morning reminder failed', { uid, error });
    }
  }
  return { checked: snap.size, sent };
}
