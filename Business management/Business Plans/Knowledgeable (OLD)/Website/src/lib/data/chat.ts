"use client";

import {
  collection,
  doc,
  getDoc,
  limit,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { getBlob, ref, uploadBytes } from 'firebase/storage';
import { getDb, getFirebaseStorage } from '@/lib/firebase/client';
import { conversationFromDoc, messageFromDoc } from '@/lib/data/converters';
import type { ChatAttachment, ChatMessage, Conversation } from '@/lib/types';

export const MESSAGE_MAX_LENGTH = 2000;

/** One thread per pair of users: the id is both uids, sorted. */
export function conversationIdFor(a: string, b: string): string {
  return [a, b].sort().join('_');
}

export function subscribeConversations(uid: string, onChange: (items: Conversation[]) => void, onError: (e: Error) => void) {
  return onSnapshot(
    query(collection(getDb(), 'conversations'), where('participantIds', 'array-contains', uid), orderBy('updatedAt', 'desc'), limit(50)),
    (snap) => onChange(snap.docs.map(conversationFromDoc)),
    onError
  );
}

export async function getConversation(convoId: string): Promise<Conversation | null> {
  const snap = await getDoc(doc(getDb(), 'conversations', convoId));
  return snap.exists() ? conversationFromDoc(snap) : null;
}

export async function ensureConversation(me: string, other: string): Promise<string> {
  const id = conversationIdFor(me, other);
  const existing = await getDoc(doc(getDb(), 'conversations', id));
  if (!existing.exists()) {
    await setDoc(doc(getDb(), 'conversations', id), {
      participantIds: [me, other].sort(),
      updatedAt: serverTimestamp(),
    });
  }
  return id;
}

export function subscribeMessages(convoId: string, onChange: (items: ChatMessage[]) => void, onError: (e: Error) => void) {
  return onSnapshot(
    query(collection(getDb(), 'conversations', convoId, 'messages'), orderBy('createdAt', 'asc'), limitToLast(200)),
    (snap) => onChange(snap.docs.map(messageFromDoc)),
    onError
  );
}

export async function sendMessage(convoId: string, senderId: string, text: string): Promise<string> {
  const db = getDb();
  const clean = text.trim().slice(0, MESSAGE_MAX_LENGTH);
  const batch = writeBatch(db);
  const messageRef = doc(collection(db, 'conversations', convoId, 'messages'));
  batch.set(messageRef, {
    senderId,
    text: clean,
    createdAt: serverTimestamp(),
  });
  batch.update(doc(db, 'conversations', convoId), {
    lastMessage: { text: clean.slice(0, 200), senderId, createdAt: serverTimestamp() },
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
  return messageRef.id;
}

// ---------- file sharing ----------

export const CHAT_FILE_MAX_MB = 25;
/** Keep in sync with storage.rules (chatFile) and firestore.rules (validChatAttachment). */
export const CHAT_FILE_TYPES = [
  'image/png', 'image/jpeg', 'image/webp', 'image/gif',
  'application/pdf', 'text/plain', 'text/csv', 'application/epub+zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export function isAcceptedChatFile(file: File): boolean {
  return CHAT_FILE_TYPES.includes(file.type) && file.size > 0 && file.size <= CHAT_FILE_MAX_MB * 1024 * 1024;
}

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-80) || 'file';
}

/**
 * Shares a file in a conversation. The file sits in a folder only the two participants can read
 * (enforced by storage.rules); the message records where it is. Returns the new message id.
 */
export async function sendAttachment(convoId: string, senderId: string, file: File, caption = ''): Promise<string> {
  const db = getDb();
  const messageRef = doc(collection(db, 'conversations', convoId, 'messages'));
  const path = `chats/${convoId}/${senderId}/${messageRef.id}-${safeFileName(file.name)}`;
  await uploadBytes(ref(getFirebaseStorage(), path), file, { contentType: file.type });
  const attachment: ChatAttachment = { path, name: file.name.slice(0, 200), contentType: file.type, size: file.size };
  const text = caption.trim().slice(0, MESSAGE_MAX_LENGTH);
  const batch = writeBatch(db);
  batch.set(messageRef, { senderId, text, attachment, createdAt: serverTimestamp() });
  batch.update(doc(db, 'conversations', convoId), {
    lastMessage: { text: `📎 ${attachment.name}`.slice(0, 200), senderId, createdAt: serverTimestamp() },
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
  return messageRef.id;
}

/** Downloads a shared file through the SDK (no public URL exists), for preview or saving. */
export async function fetchAttachment(attachment: ChatAttachment): Promise<Blob> {
  return getBlob(ref(getFirebaseStorage(), attachment.path));
}
