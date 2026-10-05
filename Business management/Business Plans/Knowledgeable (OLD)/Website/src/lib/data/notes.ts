"use client";

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
} from 'firebase/firestore';
import { getDb } from '@/lib/firebase/client';
import { annotationFromDoc, bookmarkFromDoc, reflectionFromDoc } from '@/lib/data/converters';
import type { Annotation, Bookmark, HighlightColour, Reflection } from '@/lib/types';

/** All of these live under users/{uid}/… and are private to their owner (see firestore.rules). */

export const NOTE_MAX_LENGTH = 2000;
export const QUOTE_MAX_LENGTH = 1000;
export const ANSWER_MAX_LENGTH = 3000;

// ---------- highlights & notes ----------

export function subscribeAnnotations(uid: string, bookId: string, onChange: (items: Annotation[]) => void) {
  return onSnapshot(
    query(collection(getDb(), 'users', uid, 'annotations'), where('bookId', '==', bookId)),
    (snap) => onChange(snap.docs.map(annotationFromDoc).sort((a, b) => a.chapterIndex - b.chapterIndex || a.paragraphIndex - b.paragraphIndex || a.start - b.start)),
    () => onChange([])
  );
}

export async function addAnnotation(
  uid: string,
  input: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const ref = doc(collection(getDb(), 'users', uid, 'annotations'));
  const data: DocumentData = {
    bookId: input.bookId,
    bookTitle: input.bookTitle.slice(0, 300),
    chapterIndex: input.chapterIndex,
    paragraphIndex: input.paragraphIndex,
    start: input.start,
    end: input.end,
    quote: input.quote.slice(0, QUOTE_MAX_LENGTH),
    colour: input.colour,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (input.note?.trim()) data.note = input.note.trim().slice(0, NOTE_MAX_LENGTH);
  await setDoc(ref, data);
  return ref.id;
}

export async function updateAnnotation(uid: string, id: string, fields: { note?: string; colour?: HighlightColour }) {
  const update: DocumentData = { updatedAt: serverTimestamp() };
  if (fields.note !== undefined) update.note = fields.note.trim().slice(0, NOTE_MAX_LENGTH);
  if (fields.colour) update.colour = fields.colour;
  await updateDoc(doc(getDb(), 'users', uid, 'annotations', id), update);
}

export async function deleteAnnotation(uid: string, id: string) {
  await deleteDoc(doc(getDb(), 'users', uid, 'annotations', id));
}

// ---------- bookmarks ----------

export function subscribeBookmarks(uid: string, bookId: string, onChange: (items: Bookmark[]) => void) {
  return onSnapshot(
    query(collection(getDb(), 'users', uid, 'bookmarks'), where('bookId', '==', bookId)),
    (snap) => onChange(snap.docs.map(bookmarkFromDoc).sort((a, b) => a.chapterIndex - b.chapterIndex || a.paragraphIndex - b.paragraphIndex)),
    () => onChange([])
  );
}

/** One bookmark per paragraph, so the id is deterministic and toggling is idempotent. */
export function bookmarkId(bookId: string, chapterIndex: number, paragraphIndex: number) {
  return `${bookId}_${chapterIndex}_${paragraphIndex}`;
}

export async function addBookmark(uid: string, input: Omit<Bookmark, 'id' | 'createdAt'>): Promise<void> {
  await setDoc(doc(getDb(), 'users', uid, 'bookmarks', bookmarkId(input.bookId, input.chapterIndex, input.paragraphIndex)), {
    bookId: input.bookId,
    bookTitle: input.bookTitle.slice(0, 300),
    chapterIndex: input.chapterIndex,
    paragraphIndex: input.paragraphIndex,
    chapterTitle: input.chapterTitle.slice(0, 200),
    snippet: input.snippet.slice(0, 300),
    createdAt: serverTimestamp(),
  });
}

export async function deleteBookmark(uid: string, id: string) {
  await deleteDoc(doc(getDb(), 'users', uid, 'bookmarks', id));
}

// ---------- reflections ("quiz" after finishing, no right answers) ----------

export async function getReflection(uid: string, bookId: string): Promise<Reflection | null> {
  const snap = await getDoc(doc(getDb(), 'users', uid, 'reflections', bookId));
  return snap.exists() ? reflectionFromDoc(snap) : null;
}

export async function saveReflection(uid: string, bookId: string, bookTitle: string, answers: Reflection['answers']) {
  await setDoc(doc(getDb(), 'users', uid, 'reflections', bookId), {
    bookTitle: bookTitle.slice(0, 300),
    answers: answers
      .filter((a) => a.answer.trim())
      .slice(0, 10)
      .map((a) => ({ question: a.question.slice(0, 300), answer: a.answer.trim().slice(0, ANSWER_MAX_LENGTH) })),
    updatedAt: serverTimestamp(),
  });
}

// ---------- everything, for the Notes page ----------

export async function listAllNotes(uid: string): Promise<{ annotations: Annotation[]; bookmarks: Bookmark[]; reflections: Reflection[] }> {
  const db = getDb();
  const [a, b, r] = await Promise.all([
    getDocs(query(collection(db, 'users', uid, 'annotations'), orderBy('updatedAt', 'desc'), limit(500))),
    getDocs(query(collection(db, 'users', uid, 'bookmarks'), orderBy('createdAt', 'desc'), limit(500))),
    getDocs(query(collection(db, 'users', uid, 'reflections'), orderBy('updatedAt', 'desc'), limit(200))),
  ]);
  return {
    annotations: a.docs.map(annotationFromDoc),
    bookmarks: b.docs.map(bookmarkFromDoc),
    reflections: r.docs.map(reflectionFromDoc),
  };
}
