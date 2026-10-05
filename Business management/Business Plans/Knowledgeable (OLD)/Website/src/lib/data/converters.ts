import { Timestamp, type DocumentData, type DocumentSnapshot, type QueryDocumentSnapshot } from 'firebase/firestore';
import type {
  Annotation,
  AppNotification,
  Book,
  Bookmark,
  Reflection,
  Chapter,
  ChatMessage,
  Comment,
  Conversation,
  LibraryEntry,
  Post,
  PublicProfile,
  SavedItem,
} from '@/lib/types';

type Snap = DocumentSnapshot<DocumentData> | QueryDocumentSnapshot<DocumentData>;

/** Pending server timestamps are estimated locally so freshly written docs render immediately. */
function dataOf(snap: Snap): DocumentData {
  return snap.data({ serverTimestamps: 'estimate' }) ?? {};
}

export function toIso(value: unknown): string {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return new Date(0).toISOString();
}

function optionalIso(value: unknown): string | undefined {
  return value == null ? undefined : toIso(value);
}

export function profileFromDoc(snap: Snap): PublicProfile {
  const d = dataOf(snap);
  return {
    id: snap.id,
    displayName: d.displayName ?? 'Unknown',
    handle: d.handle ?? '',
    avatarUrl: d.avatarUrl,
    bio: d.bio,
    interests: Array.isArray(d.interests) ? d.interests : [],
    readingPublic: d.readingPublic !== false,
    createdAt: toIso(d.createdAt),
  };
}

export function postFromDoc(snap: Snap): Post {
  const d = dataOf(snap);
  return {
    id: snap.id,
    authorId: d.authorId,
    authorName: d.authorName ?? 'Unknown',
    authorHandle: d.authorHandle ?? '',
    authorAvatarUrl: d.authorAvatarUrl,
    type: d.type,
    title: d.title ?? '',
    body: d.body ?? '',
    topics: Array.isArray(d.topics) ? d.topics : [],
    authors: d.authors,
    source: d.source,
    poll: d.poll,
    pollCounts: d.pollCounts ?? {},
    media: d.media,
    attachment: d.attachment,
    likeCount: typeof d.likeCount === 'number' ? d.likeCount : 0,
    createdAt: toIso(d.createdAt),
  };
}

export function commentFromDoc(snap: Snap): Comment {
  const d = dataOf(snap);
  return {
    id: snap.id,
    authorId: d.authorId,
    authorName: d.authorName ?? 'Unknown',
    authorAvatarUrl: d.authorAvatarUrl,
    text: d.text ?? '',
    createdAt: toIso(d.createdAt),
  };
}

export function bookFromDoc(snap: Snap): Book {
  const d = dataOf(snap);
  return {
    id: snap.id,
    kind: d.kind === 'paper' || d.kind === 'article' ? d.kind : 'book',
    title: d.title ?? 'Untitled',
    author: d.author ?? '',
    description: d.description,
    publishedYear: d.publishedYear,
    topics: Array.isArray(d.topics) ? d.topics : [],
    coverUrl: d.coverUrl,
    readable: d.readable === true,
    license: d.license,
    sourceUrl: d.sourceUrl,
    chapterCount: d.chapterCount,
    wordCount: d.wordCount,
    archiveId: d.archiveId,
    openLibraryId: d.openLibraryId,
    attribution: d.attribution,
    journal: d.journal,
    doi: d.doi,
    pmcid: d.pmcid,
  };
}

export function chapterFromDoc(snap: Snap): Chapter {
  const d = dataOf(snap);
  return {
    index: typeof d.index === 'number' ? d.index : Number(snap.id),
    title: d.title ?? '',
    body: d.body ?? '',
    wordCount: d.wordCount ?? 0,
  };
}

export function libraryFromDoc(snap: Snap): LibraryEntry {
  const d = dataOf(snap);
  return {
    bookId: snap.id,
    status: d.status,
    progress: d.progress ?? 0,
    chapterIndex: d.chapterIndex ?? 0,
    chapterProgress: d.chapterProgress ?? 0,
    finishedInApp: d.finishedInApp === true,
    bookTitle: d.bookTitle ?? '',
    bookAuthor: d.bookAuthor ?? '',
    bookCoverUrl: d.bookCoverUrl,
    startedAt: optionalIso(d.startedAt),
    finishedAt: optionalIso(d.finishedAt),
    updatedAt: toIso(d.updatedAt),
  };
}

export function savedFromDoc(snap: Snap): SavedItem {
  const d = dataOf(snap);
  return {
    postId: snap.id,
    postTitle: d.postTitle ?? '',
    postType: d.postType,
    savedAt: toIso(d.savedAt),
    reviewStage: d.reviewStage ?? 0,
    nextReviewAt: toIso(d.nextReviewAt),
  };
}

export function conversationFromDoc(snap: Snap): Conversation {
  const d = dataOf(snap);
  return {
    id: snap.id,
    participantIds: d.participantIds ?? [],
    lastMessage: d.lastMessage
      ? { text: d.lastMessage.text, senderId: d.lastMessage.senderId, createdAt: toIso(d.lastMessage.createdAt) }
      : undefined,
    updatedAt: toIso(d.updatedAt),
  };
}

export function messageFromDoc(snap: Snap): ChatMessage {
  const d = dataOf(snap);
  return {
    id: snap.id,
    senderId: d.senderId,
    text: d.text ?? '',
    attachment: d.attachment,
    createdAt: toIso(d.createdAt),
  };
}

export function annotationFromDoc(snap: Snap): Annotation {
  const d = dataOf(snap);
  return {
    id: snap.id,
    bookId: d.bookId,
    bookTitle: d.bookTitle ?? '',
    chapterIndex: d.chapterIndex ?? 0,
    paragraphIndex: d.paragraphIndex ?? 0,
    start: d.start ?? 0,
    end: d.end ?? 0,
    quote: d.quote ?? '',
    note: d.note || undefined,
    colour: d.colour ?? 'yellow',
    createdAt: toIso(d.createdAt),
    updatedAt: toIso(d.updatedAt),
  };
}

export function bookmarkFromDoc(snap: Snap): Bookmark {
  const d = dataOf(snap);
  return {
    id: snap.id,
    bookId: d.bookId,
    bookTitle: d.bookTitle ?? '',
    chapterIndex: d.chapterIndex ?? 0,
    paragraphIndex: d.paragraphIndex ?? 0,
    chapterTitle: d.chapterTitle ?? '',
    snippet: d.snippet ?? '',
    createdAt: toIso(d.createdAt),
  };
}

export function reflectionFromDoc(snap: Snap): Reflection {
  const d = dataOf(snap);
  return {
    bookId: snap.id,
    bookTitle: d.bookTitle ?? '',
    answers: Array.isArray(d.answers) ? d.answers : [],
    updatedAt: toIso(d.updatedAt),
  };
}

export function notificationFromDoc(snap: Snap): AppNotification {
  const d = dataOf(snap);
  return {
    id: snap.id,
    type: d.type,
    actorId: d.actorId,
    actorName: d.actorName,
    actorAvatarUrl: d.actorAvatarUrl,
    postId: d.postId,
    postTitle: d.postTitle,
    conversationId: d.conversationId,
    snippet: d.snippet,
    dueCount: d.dueCount,
    bookId: d.bookId,
    bookTitle: d.bookTitle,
    read: d.read === true,
    createdAt: toIso(d.createdAt),
  };
}
