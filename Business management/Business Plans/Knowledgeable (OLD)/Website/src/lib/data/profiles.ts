"use client";

import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { getDb, getFirebaseStorage } from '@/lib/firebase/client';
import { profileFromDoc } from '@/lib/data/converters';
import type { PrivateAccount, PublicProfile } from '@/lib/types';

export const HANDLE_PATTERN = /^[a-z0-9_]{3,20}$/;

export function suggestHandle(displayName: string): string {
  const base = displayName
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 16);
  return base.length >= 3 ? base : `${base}reader`.slice(0, 16);
}

export async function getProfile(uid: string): Promise<PublicProfile | null> {
  const snap = await getDoc(doc(getDb(), 'users', uid));
  return snap.exists() ? profileFromDoc(snap) : null;
}

export async function isHandleAvailable(handle: string): Promise<boolean> {
  if (!HANDLE_PATTERN.test(handle)) return false;
  const snap = await getDoc(doc(getDb(), 'handles', handle));
  return !snap.exists();
}

/** Claims the handle and creates the public profile atomically (see handles rules). */
export async function createProfile(input: {
  uid: string;
  displayName: string;
  handle: string;
  interests: string[];
  avatarUrl?: string | null;
}): Promise<void> {
  const db = getDb();
  const batch = writeBatch(db);
  batch.set(doc(db, 'handles', input.handle), { uid: input.uid });
  const profile: DocumentData = {
    displayName: input.displayName,
    nameLower: input.displayName.toLowerCase(),
    handle: input.handle,
    interests: input.interests,
    readingPublic: true,
    createdAt: serverTimestamp(),
  };
  if (input.avatarUrl) profile.avatarUrl = input.avatarUrl;
  batch.set(doc(db, 'users', input.uid), profile);
  await batch.commit();
}

export async function updateProfileFields(
  uid: string,
  fields: Partial<Pick<PublicProfile, 'displayName' | 'bio' | 'interests' | 'readingPublic' | 'avatarUrl'>>
): Promise<void> {
  const update: DocumentData = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) update[key] = value;
  }
  if (fields.displayName !== undefined) update.nameLower = fields.displayName.toLowerCase();
  await updateDoc(doc(getDb(), 'users', uid), update);
}

export async function uploadAvatar(uid: string, file: File): Promise<string> {
  const ext = file.type.split('/')[1] ?? 'png';
  const storageRef = ref(getFirebaseStorage(), `users/${uid}/avatar/avatar-${Date.now()}.${ext}`);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}

export async function getPrivateAccount(uid: string): Promise<PrivateAccount> {
  const snap = await getDoc(doc(getDb(), 'users', uid, 'private', 'account'));
  return (snap.data() as PrivateAccount | undefined) ?? {};
}

export async function savePrivateAccount(uid: string, account: PrivateAccount): Promise<void> {
  const clean: DocumentData = {};
  for (const [key, value] of Object.entries(account)) {
    if (value !== undefined && value !== '' && !(typeof value === 'number' && Number.isNaN(value))) clean[key] = value;
  }
  await setDoc(doc(getDb(), 'users', uid, 'private', 'account'), clean);
}

// ---------- follow graph ----------

export async function isFollowing(me: string, target: string): Promise<boolean> {
  const snap = await getDoc(doc(getDb(), 'users', me, 'following', target));
  return snap.exists();
}

export async function setFollowing(me: string, target: string, follow: boolean): Promise<void> {
  const db = getDb();
  const batch = writeBatch(db);
  const followingRef = doc(db, 'users', me, 'following', target);
  const followerRef = doc(db, 'users', target, 'followers', me);
  if (follow) {
    batch.set(followingRef, { uid: target, createdAt: serverTimestamp() });
    batch.set(followerRef, { uid: me, createdAt: serverTimestamp() });
  } else {
    batch.delete(followingRef);
    batch.delete(followerRef);
  }
  await batch.commit();
}

export async function getFollowCounts(uid: string): Promise<{ followers: number; following: number }> {
  const db = getDb();
  const [followers, following] = await Promise.all([
    getCountFromServer(collection(db, 'users', uid, 'followers')),
    getCountFromServer(collection(db, 'users', uid, 'following')),
  ]);
  return { followers: followers.data().count, following: following.data().count };
}

export async function listFollowingIds(uid: string, max = 30): Promise<string[]> {
  const snap = await getDocs(query(collection(getDb(), 'users', uid, 'following'), limit(max)));
  return snap.docs.map((d) => d.id);
}

/** Prefix search on handle and display name. */
export async function searchProfiles(term: string, max = 12): Promise<PublicProfile[]> {
  const q = term.trim().toLowerCase().replace(/^@/, '');
  if (q.length < 2) return [];
  const db = getDb();
  const users = collection(db, 'users');
  const [byHandle, byName] = await Promise.all([
    getDocs(query(users, where('handle', '>=', q), where('handle', '<=', `${q}`), orderBy('handle'), limit(max))),
    getDocs(query(users, where('nameLower', '>=', q), where('nameLower', '<=', `${q}`), orderBy('nameLower'), limit(max))),
  ]);
  const seen = new Map<string, PublicProfile>();
  for (const snap of [...byHandle.docs, ...byName.docs]) seen.set(snap.id, profileFromDoc(snap));
  return Array.from(seen.values()).slice(0, max);
}
