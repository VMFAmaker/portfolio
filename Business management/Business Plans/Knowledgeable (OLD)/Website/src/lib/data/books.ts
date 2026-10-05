"use client";

import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { getDb } from '@/lib/firebase/client';
import { bookFromDoc, chapterFromDoc } from '@/lib/data/converters';
import type { Book, Chapter } from '@/lib/types';

let catalogCache: Promise<Book[]> | null = null;

/** The catalog is small and changes rarely, so it is loaded once per session and searched locally. */
export function listCatalog(): Promise<Book[]> {
  catalogCache ??= getDocs(query(collection(getDb(), 'books'), orderBy('title'), limit(1000)))
    .then((snap) => snap.docs.map(bookFromDoc))
    .catch((error) => {
      catalogCache = null;
      throw error;
    });
  return catalogCache;
}

/** Call after adding books so the next listCatalog() sees them. */
export function invalidateCatalog(): void {
  catalogCache = null;
}

export async function getBook(bookId: string): Promise<Book | null> {
  const snap = await getDoc(doc(getDb(), 'books', bookId));
  return snap.exists() ? bookFromDoc(snap) : null;
}

export async function getChapter(bookId: string, index: number): Promise<Chapter | null> {
  const snap = await getDoc(doc(getDb(), 'books', bookId, 'chapters', String(index)));
  return snap.exists() ? chapterFromDoc(snap) : null;
}

export async function listChapterTitles(bookId: string): Promise<Array<{ index: number; title: string }>> {
  const snap = await getDocs(query(collection(getDb(), 'books', bookId, 'chapters'), orderBy('index')));
  return snap.docs.map((d) => ({ index: d.data().index as number, title: d.data().title as string }));
}

export async function listBooksByTopic(topicId: string): Promise<Book[]> {
  const snap = await getDocs(query(collection(getDb(), 'books'), where('topics', 'array-contains', topicId), limit(60)));
  return snap.docs.map(bookFromDoc);
}

export function searchCatalog(books: Book[], term: string): Book[] {
  const q = term.trim().toLowerCase();
  if (!q) return [];
  return books.filter((b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q));
}
