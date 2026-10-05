"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  documentId,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  where,
  writeBatch,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { getDb, getFirebaseStorage } from '@/lib/firebase/client';
import { commentFromDoc, postFromDoc, savedFromDoc } from '@/lib/data/converters';
import { expandInterests } from '@/lib/taxonomy';
import { nextReviewDate } from '@/lib/data/spaced-repetition';
import type { Comment, Post, PostSource, PostType, PublicProfile, SavedItem } from '@/lib/types';

export const IDEA_MAX_LENGTH = 600;
export const POST_BODY_MAX_LENGTH = 20000;
export const TITLE_MAX_LENGTH = 200;
export const COMMENT_MAX_LENGTH = 2000;
export const MAX_POST_TOPICS = 3;
export const MIN_POLL_OPTIONS = 2;
export const MAX_POLL_OPTIONS = 5;
export const MAX_VIDEO_MB = 100;
export const MAX_IMAGE_MB = 10;
export const MAX_DOCUMENT_MB = 25;

const STOP_WORDS = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'into', 'are', 'was', 'its', 'of', 'to', 'in', 'on', 'an', 'is', 'my', 'a']);

/** Lower-cased, de-accented words used for simple keyword search. */
export function keywordsFor(...texts: Array<string | undefined>): string[] {
  const words = new Set<string>();
  for (const text of texts) {
    if (!text) continue;
    const normalized = text.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
    for (const word of normalized.split(/[^\p{L}\p{N}]+/u)) {
      if (word.length >= 2 && !STOP_WORDS.has(word)) words.add(word);
    }
  }
  return Array.from(words).slice(0, 40);
}

// ---------- reading posts ----------

export async function getPost(postId: string): Promise<Post | null> {
  const snap = await getDoc(doc(getDb(), 'posts', postId));
  return snap.exists() ? postFromDoc(snap) : null;
}

async function getPostsByIds(ids: string[]): Promise<Post[]> {
  if (ids.length === 0) return [];
  const snap = await getDocs(query(collection(getDb(), 'posts'), where(documentId(), 'in', ids.slice(0, 30))));
  const byId = new Map(snap.docs.map((d) => [d.id, postFromDoc(d)]));
  return ids.map((id) => byId.get(id)).filter((p): p is Post => Boolean(p));
}

async function runPostQuery(constraints: QueryConstraint[]): Promise<{ posts: Post[]; last: QueryDocumentSnapshot | null }> {
  const snap = await getDocs(query(collection(getDb(), 'posts'), ...constraints));
  return { posts: snap.docs.map(postFromDoc), last: snap.docs.at(-1) ?? null };
}

export type FeedReason = 'interest' | 'adjacent' | 'revisit' | 'latest' | 'following';
export interface FeedItem {
  post: Post;
  reason: FeedReason;
}
export interface FeedPage {
  items: FeedItem[];
  cursor: QueryDocumentSnapshot | null;
}

/** Fisher–Yates shuffle (returns a new array). */
export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * The personalised "For you" feed:
 *  • posts in the user's interests (a whole subject includes all its niches), in a new random
 *    order on every visit so the home screen never looks the same twice,
 *  • roughly one in five from adjacent niches, to widen knowledge gently,
 *  • saved ideas that are due for review, resurfaced in-line (spaced repetition),
 *  • topped up with the latest posts when a niche is still quiet.
 */
export async function loadForYouFeed(
  uid: string,
  interests: string[],
  cursor: QueryDocumentSnapshot | null,
  pageSize = 12
): Promise<FeedPage> {
  const { primary, adjacent } = expandInterests(interests);
  // The first page draws from a wider pool so the shuffle has more to choose from.
  const fetchSize = cursor ? pageSize : pageSize * 2;
  const base: QueryConstraint[] = [orderBy('createdAt', 'desc'), limit(fetchSize)];
  if (cursor) base.push(startAfter(cursor));

  const primaryResult = primary.length
    ? await runPostQuery([where('topics', 'array-contains-any', primary.slice(0, 30)), ...base])
    : await runPostQuery(base);
  let items: FeedItem[] = primaryResult.posts.map((post) => ({ post, reason: primary.length ? 'interest' : 'latest' }));
  const seen = new Set(items.map((i) => i.post.id));

  if (!cursor) {
    const [adjacentPosts, revisitPosts, latest] = await Promise.all([
      adjacent.length
        ? runPostQuery([where('topics', 'array-contains-any', shuffle(adjacent).slice(0, 30)), orderBy('createdAt', 'desc'), limit(8)])
            .then((r) => shuffle(r.posts).slice(0, 3))
            .catch(() => [])
        : Promise.resolve([] as Post[]),
      listDueForReview(uid, 2).then((saved) => getPostsByIds(saved.map((s) => s.postId))).catch(() => []),
      items.length < fetchSize && primary.length
        ? runPostQuery([orderBy('createdAt', 'desc'), limit(fetchSize)]).then((r) => r.posts)
        : Promise.resolve([] as Post[]),
    ]);

    for (const post of latest) {
      if (items.length >= fetchSize) break;
      if (!seen.has(post.id)) {
        items.push({ post, reason: 'latest' });
        seen.add(post.id);
      }
    }
    items = shuffle(items);
    let slot = 4;
    for (const post of adjacentPosts) {
      if (seen.has(post.id)) continue;
      items.splice(Math.min(slot, items.length), 0, { post, reason: 'adjacent' });
      seen.add(post.id);
      slot += 5;
    }
    let revisitSlot = 2;
    for (const post of revisitPosts) {
      items.splice(Math.min(revisitSlot, items.length), 0, { post, reason: 'revisit' });
      revisitSlot += 5;
    }
  } else {
    items = shuffle(items);
  }

  return { items, cursor: primaryResult.posts.length === fetchSize ? primaryResult.last : null };
}

export async function loadFollowingFeed(followingIds: string[], cursor: QueryDocumentSnapshot | null, pageSize = 12): Promise<FeedPage> {
  if (followingIds.length === 0) return { items: [], cursor: null };
  const constraints: QueryConstraint[] = [where('authorId', 'in', followingIds.slice(0, 30)), orderBy('createdAt', 'desc'), limit(pageSize)];
  if (cursor) constraints.push(startAfter(cursor));
  const result = await runPostQuery(constraints);
  return {
    items: result.posts.map((post) => ({ post, reason: 'following' as const })),
    cursor: result.posts.length === pageSize ? result.last : null,
  };
}

export async function listPostsByAuthor(authorId: string, max = 50): Promise<Post[]> {
  return (await runPostQuery([where('authorId', '==', authorId), orderBy('createdAt', 'desc'), limit(max)])).posts;
}

export async function listPostsByTopic(topicId: string, max = 40): Promise<Post[]> {
  return (await runPostQuery([where('topics', 'array-contains', topicId), orderBy('createdAt', 'desc'), limit(max)])).posts;
}

export async function listReels(cursor: QueryDocumentSnapshot | null, pageSize = 8) {
  const constraints: QueryConstraint[] = [where('type', '==', 'reel'), orderBy('createdAt', 'desc'), limit(pageSize)];
  if (cursor) constraints.push(startAfter(cursor));
  const result = await runPostQuery(constraints);
  return { posts: result.posts, cursor: result.posts.length === pageSize ? result.last : null };
}

/** Keyword search: Firestore narrows by the rarest word; remaining words are matched locally. */
export async function searchPosts(term: string, max = 30): Promise<Post[]> {
  const words = keywordsFor(term);
  if (words.length === 0) return [];
  const anchor = [...words].sort((a, b) => b.length - a.length)[0];
  const { posts } = await runPostQuery([where('keywords', 'array-contains', anchor), orderBy('createdAt', 'desc'), limit(60)]);
  return posts
    .filter((p) => {
      const haystack = keywordsFor(p.title, p.body, p.source?.title, ...(p.authors ?? []));
      return words.every((w) => haystack.some((h) => h.startsWith(w)));
    })
    .slice(0, max);
}

// ---------- creating posts ----------

export interface NewPostInput {
  type: PostType;
  title: string;
  body: string;
  topics: string[];
  authors?: string[];
  source?: PostSource;
  poll?: { question: string; options: string[] };
  imageFile?: File | null;
  videoFile?: File | null;
  documentFile?: File | null;
}

function uploadFile(path: string, file: File, onProgress?: (fraction: number) => void): Promise<string> {
  const storageRef = ref(getFirebaseStorage(), path);
  const task = uploadBytesResumable(storageRef, file, { contentType: file.type });
  return new Promise((resolve, reject) => {
    task.on(
      'state_changed',
      (s) => onProgress?.(s.totalBytes ? s.bytesTransferred / s.totalBytes : 0),
      reject,
      () => getDownloadURL(storageRef).then(resolve, reject)
    );
  });
}

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-80) || 'file';
}

export async function createPost(
  author: PublicProfile,
  input: NewPostInput,
  onUploadProgress?: (fraction: number) => void
): Promise<string> {
  const db = getDb();
  const postRef = doc(collection(db, 'posts'));
  const folder = `posts/${author.id}/${postRef.id}`;
  const uploadedPaths: string[] = [];

  try {
    const data: DocumentData = {
      authorId: author.id,
      authorName: author.displayName,
      authorHandle: author.handle,
      type: input.type,
      title: input.title.trim(),
      body: input.body.trim(),
      topics: input.topics,
      keywords: keywordsFor(input.title, input.source?.title, ...(input.authors ?? [])),
      likeCount: 0,
      createdAt: serverTimestamp(),
    };
    if (author.avatarUrl) data.authorAvatarUrl = author.avatarUrl;
    if (input.authors?.length) data.authors = input.authors;
    if (input.source) {
      const source: DocumentData = { kind: input.source.kind, title: input.source.title };
      if (input.source.id) source.id = input.source.id;
      if (input.source.url) source.url = input.source.url;
      data.source = source;
    }
    if (input.type === 'poll' && input.poll) {
      data.poll = { question: input.poll.question.trim(), options: input.poll.options.map((o) => o.trim()) };
      data.pollCounts = {};
    }

    const media: DocumentData = {};
    if (input.imageFile) {
      const path = `${folder}/image-${safeFileName(input.imageFile.name)}`;
      media.imageUrl = await uploadFile(path, input.imageFile);
      uploadedPaths.push(path);
    }
    if (input.videoFile) {
      const path = `${folder}/video-${safeFileName(input.videoFile.name)}`;
      media.videoUrl = await uploadFile(path, input.videoFile, onUploadProgress);
      uploadedPaths.push(path);
    }
    if (Object.keys(media).length) data.media = media;

    if (input.documentFile) {
      const path = `${folder}/doc-${safeFileName(input.documentFile.name)}`;
      const url = await uploadFile(path, input.documentFile, onUploadProgress);
      uploadedPaths.push(path);
      data.attachment = {
        path,
        name: input.documentFile.name.slice(0, 200),
        contentType: input.documentFile.type,
        size: input.documentFile.size,
        url,
      };
    }

    await setDoc(postRef, data);
    return postRef.id;
  } catch (error) {
    // Don't leave orphaned uploads behind if the post itself was rejected.
    await Promise.all(uploadedPaths.map((p) => deleteObject(ref(getFirebaseStorage(), p)).catch(() => undefined)));
    throw error;
  }
}

export async function deletePost(post: Post): Promise<void> {
  await deleteDoc(doc(getDb(), 'posts', post.id));
  const storage = getFirebaseStorage();
  const urls = [post.media?.imageUrl, post.media?.videoUrl, post.attachment?.url].filter(Boolean) as string[];
  await Promise.all(urls.map((u) => deleteObject(ref(storage, u)).catch(() => undefined)));
}

// ---------- likes ----------

export async function hasLiked(postId: string, uid: string): Promise<boolean> {
  return (await getDoc(doc(getDb(), 'posts', postId, 'likes', uid))).exists();
}

/** Like doc + counter change in one batch — the rules reject either on its own. */
export async function setLiked(postId: string, uid: string, like: boolean): Promise<void> {
  const db = getDb();
  const batch = writeBatch(db);
  const likeRef = doc(db, 'posts', postId, 'likes', uid);
  if (like) batch.set(likeRef, { uid, createdAt: serverTimestamp() });
  else batch.delete(likeRef);
  batch.update(doc(db, 'posts', postId), { likeCount: increment(like ? 1 : -1) });
  await batch.commit();
}

// ---------- polls ----------

export async function getMyVote(postId: string, uid: string): Promise<number | null> {
  const snap = await getDoc(doc(getDb(), 'posts', postId, 'votes', uid));
  return snap.exists() ? (snap.data().option as number) : null;
}

export async function castVote(postId: string, uid: string, option: number): Promise<void> {
  const db = getDb();
  const batch = writeBatch(db);
  batch.set(doc(db, 'posts', postId, 'votes', uid), { uid, option, createdAt: serverTimestamp() });
  batch.update(doc(db, 'posts', postId), { [`pollCounts.${option}`]: increment(1) });
  await batch.commit();
}

// ---------- comments ----------

export async function listComments(postId: string, max = 100): Promise<Comment[]> {
  const snap = await getDocs(query(collection(getDb(), 'posts', postId, 'comments'), orderBy('createdAt', 'asc'), limit(max)));
  return snap.docs.map(commentFromDoc);
}

export async function addComment(postId: string, author: PublicProfile, text: string): Promise<Comment> {
  const data: DocumentData = {
    authorId: author.id,
    authorName: author.displayName,
    text: text.trim(),
    createdAt: serverTimestamp(),
  };
  if (author.avatarUrl) data.authorAvatarUrl = author.avatarUrl;
  const created = await addDoc(collection(getDb(), 'posts', postId, 'comments'), data);
  return {
    id: created.id,
    authorId: author.id,
    authorName: author.displayName,
    authorAvatarUrl: author.avatarUrl,
    text: text.trim(),
    createdAt: new Date().toISOString(),
  };
}

export async function deleteComment(postId: string, commentId: string): Promise<void> {
  await deleteDoc(doc(getDb(), 'posts', postId, 'comments', commentId));
}

// ---------- saved ("stash") + spaced repetition ----------

export async function isSaved(uid: string, postId: string): Promise<boolean> {
  return (await getDoc(doc(getDb(), 'users', uid, 'saved', postId))).exists();
}

export async function savePost(uid: string, post: Post): Promise<void> {
  await setDoc(doc(getDb(), 'users', uid, 'saved', post.id), {
    postId: post.id,
    postTitle: post.title.slice(0, 200),
    postType: post.type,
    savedAt: serverTimestamp(),
    reviewStage: 0,
    nextReviewAt: nextReviewDate(0),
  });
}

export async function unsavePost(uid: string, postId: string): Promise<void> {
  await deleteDoc(doc(getDb(), 'users', uid, 'saved', postId));
}

export async function listSaved(uid: string, max = 100): Promise<{ saved: SavedItem[]; posts: Post[] }> {
  const snap = await getDocs(query(collection(getDb(), 'users', uid, 'saved'), orderBy('savedAt', 'desc'), limit(max)));
  const saved = snap.docs.map(savedFromDoc);
  const posts: Post[] = [];
  for (let i = 0; i < saved.length; i += 30) {
    posts.push(...(await getPostsByIds(saved.slice(i, i + 30).map((s) => s.postId))));
  }
  return { saved, posts };
}

export async function listDueForReview(uid: string, max = 3): Promise<SavedItem[]> {
  const snap = await getDocs(
    query(collection(getDb(), 'users', uid, 'saved'), where('nextReviewAt', '<=', new Date()), orderBy('nextReviewAt', 'asc'), limit(max))
  );
  return snap.docs.map(savedFromDoc);
}

/**
 * "Got it" pushes the next resurfacing further out; "Show me again" starts the cycle over.
 * This is the implicit-learning loop: saved ideas keep coming back until they stick.
 */
export async function recordReview(uid: string, postId: string, remembered: boolean): Promise<void> {
  const refDoc = doc(getDb(), 'users', uid, 'saved', postId);
  const snap = await getDoc(refDoc);
  if (!snap.exists()) return;
  const current = savedFromDoc(snap);
  const stage = remembered ? Math.min(current.reviewStage + 1, 10) : 0;
  await setDoc(refDoc, { reviewStage: stage, nextReviewAt: nextReviewDate(stage) }, { merge: true });
}
