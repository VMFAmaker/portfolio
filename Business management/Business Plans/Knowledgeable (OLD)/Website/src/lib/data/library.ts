"use client";

import { collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, type DocumentData } from 'firebase/firestore';
import { getDb } from '@/lib/firebase/client';
import { libraryFromDoc } from '@/lib/data/converters';
import type { Book, LibraryEntry, ReadingStatus } from '@/lib/types';

/** Reaching this fraction of the last chapter counts as finishing the book. */
const FINISHED_THRESHOLD = 0.97;

function entryRef(uid: string, bookId: string) {
  return doc(getDb(), 'users', uid, 'library', bookId);
}

export async function getLibrary(uid: string): Promise<LibraryEntry[]> {
  const snap = await getDocs(query(collection(getDb(), 'users', uid, 'library'), orderBy('updatedAt', 'desc')));
  return snap.docs.map(libraryFromDoc);
}

export async function getLibraryEntry(uid: string, bookId: string): Promise<LibraryEntry | null> {
  const snap = await getDoc(entryRef(uid, bookId));
  return snap.exists() ? libraryFromDoc(snap) : null;
}

function baseFields(book: Book, existing: LibraryEntry | null): DocumentData {
  const data: DocumentData = {
    bookId: book.id,
    bookTitle: book.title.slice(0, 300),
    bookAuthor: book.author.slice(0, 200),
    progress: existing?.progress ?? 0,
    chapterIndex: existing?.chapterIndex ?? 0,
    chapterProgress: existing?.chapterProgress ?? 0,
    finishedInApp: existing?.finishedInApp ?? false,
    updatedAt: serverTimestamp(),
  };
  if (book.coverUrl) data.bookCoverUrl = book.coverUrl;
  return data;
}

/** Manually move a book between Want to read / Reading / Finished (or remove it). */
export async function setReadingStatus(uid: string, book: Book, status: ReadingStatus | 'none'): Promise<void> {
  if (status === 'none') {
    await deleteDoc(entryRef(uid, book.id));
    return;
  }
  const existing = await getLibraryEntry(uid, book.id);
  const data = baseFields(book, existing);
  data.status = status;
  if (status === 'reading' && !existing?.startedAt) data.startedAt = serverTimestamp();
  if (status === 'finished') {
    data.finishedAt = serverTimestamp();
    if (!existing?.startedAt) data.startedAt = serverTimestamp();
  }
  await setDoc(entryRef(uid, book.id), data, { merge: true });
}

/**
 * Called by the in-app reader as the user scrolls. Progress is only ever advanced from the
 * reader, which is what makes "finished in Knowledgeable" meaningful on a profile.
 */
export async function saveReadingProgress(
  uid: string,
  book: Book,
  chapterIndex: number,
  chapterProgress: number,
  existing: LibraryEntry | null
): Promise<LibraryEntry['status']> {
  const chapterCount = Math.max(book.chapterCount ?? 1, 1);
  const clamped = Math.min(Math.max(chapterProgress, 0), 1);
  const progress = Math.min((chapterIndex + clamped) / chapterCount, 1);
  const finished = chapterIndex >= chapterCount - 1 && clamped >= FINISHED_THRESHOLD;

  const data = baseFields(book, existing);
  data.chapterIndex = chapterIndex;
  data.chapterProgress = clamped;
  data.progress = finished ? 1 : Math.max(progress, existing?.status === 'finished' ? existing.progress : 0);
  if (!existing?.startedAt) data.startedAt = serverTimestamp();

  let status: ReadingStatus = existing?.status === 'finished' ? 'finished' : 'reading';
  if (finished && existing?.status !== 'finished') {
    status = 'finished';
    data.finishedInApp = true;
    data.finishedAt = serverTimestamp();
  }
  data.status = status;
  await setDoc(entryRef(uid, book.id), data, { merge: true });
  return status;
}
