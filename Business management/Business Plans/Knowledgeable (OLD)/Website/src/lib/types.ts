// Domain model for Knowledgeable. Every type here mirrors a Firestore document
// (see firestore.rules for the authoritative validation of each shape).
// Timestamps are converted to ISO strings when read so components can use date-fns directly.

/** users/{uid} — public profile, readable by any signed-in user. */
export interface PublicProfile {
  id: string;
  displayName: string;
  handle: string;
  avatarUrl?: string;
  bio?: string;
  /** Subject and niche-topic ids chosen in the Personalized Feed Setup (min 3). */
  interests: string[];
  /** When false, only the owner can see their reading lists. */
  readingPublic: boolean;
  createdAt: string;
}

/** users/{uid}/private/account — owner-only personal data, never shown to others. */
export interface PrivateAccount {
  nationality?: string;
  country?: string;
  spokenLanguages?: string;
  birthYear?: number;
}

export type PostType =
  | 'idea'
  | 'summary'
  | 'questions'
  | 'opinion'
  | 'article'
  | 'research'
  | 'poll'
  | 'reel';

export interface PostSource {
  kind: 'book' | 'post' | 'url';
  /** Book or post id when kind is book/post. */
  id?: string;
  title: string;
  url?: string;
}

export interface PostMedia {
  imageUrl?: string;
  videoUrl?: string;
}

export interface PostAttachment {
  path: string;
  name: string;
  contentType: string;
  size: number;
  url: string;
}

/** posts/{postId} */
export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatarUrl?: string;
  type: PostType;
  title: string;
  body: string;
  /** Subject / niche-topic ids (1–3). */
  topics: string[];
  /** Scholarly authors for articles and research. */
  authors?: string[];
  source?: PostSource;
  poll?: { question: string; options: string[] };
  /** Vote tally keyed by option index ("0", "1", ...). */
  pollCounts?: Record<string, number>;
  media?: PostMedia;
  attachment?: PostAttachment;
  likeCount: number;
  createdAt: string;
}

/** posts/{postId}/comments/{commentId} */
export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  text: string;
  createdAt: string;
}

export type WorkKind = 'book' | 'paper' | 'article';

export type WorkLicense =
  | 'public-domain'
  | 'cc-by'
  | 'cc-by-sa'
  | 'cc0'
  | 'licensed'
  | 'open-access'
  | 'metadata-only';

/**
 * books/{bookId} — a catalogue entry: a book, an academic paper or an article. Readable works
 * keep their full text in our own storage (books/{id}/chapters). Written only by admins, the
 * seed/import scripts and the server import route.
 */
export interface Book {
  id: string;
  kind: WorkKind;
  title: string;
  author: string;
  description?: string;
  publishedYear?: string;
  topics: string[];
  coverUrl?: string;
  /** True when the full text can be read in the in-app reader. */
  readable: boolean;
  license?: WorkLicense;
  /** Credit line required by the licence (e.g. CC BY). */
  attribution?: string;
  sourceUrl?: string;
  chapterCount?: number;
  wordCount?: number;
  /** Internet Archive id of a public-domain scan whose text we imported. */
  archiveId?: string;
  openLibraryId?: string;
  /** Papers: journal, DOI and PubMed Central id. */
  journal?: string;
  doi?: string;
  pmcid?: string;
}

/** books/{bookId}/chapters/{index} */
export interface Chapter {
  index: number;
  title: string;
  /** Plain text, paragraphs separated by blank lines. */
  body: string;
  wordCount: number;
}

export type ReadingStatus = 'want' | 'reading' | 'finished';

/** users/{uid}/library/{bookId} */
export interface LibraryEntry {
  bookId: string;
  status: ReadingStatus;
  /** Overall progress through the book, 0–1. */
  progress: number;
  chapterIndex: number;
  /** Scroll progress within the current chapter, 0–1. */
  chapterProgress: number;
  /** True only when the book was completed in the in-app reader. */
  finishedInApp: boolean;
  bookTitle: string;
  bookAuthor: string;
  bookCoverUrl?: string;
  startedAt?: string;
  finishedAt?: string;
  updatedAt: string;
}

/** users/{uid}/saved/{postId} — a "stash" that resurfaces with spaced repetition. */
export interface SavedItem {
  postId: string;
  postTitle: string;
  postType: PostType;
  savedAt: string;
  /** Index into REVIEW_INTERVALS_DAYS. */
  reviewStage: number;
  nextReviewAt: string;
}

export type HighlightColour = 'yellow' | 'blue' | 'green' | 'pink';

/** users/{uid}/annotations/{id} — a highlight in the reader, optionally with a note. Private. */
export interface Annotation {
  id: string;
  bookId: string;
  bookTitle: string;
  chapterIndex: number;
  paragraphIndex: number;
  /** Character offsets within the paragraph. */
  start: number;
  end: number;
  quote: string;
  note?: string;
  colour: HighlightColour;
  createdAt: string;
  updatedAt: string;
}

/** users/{uid}/bookmarks/{id} — a saved place in a work. Private. */
export interface Bookmark {
  id: string;
  bookId: string;
  bookTitle: string;
  chapterIndex: number;
  paragraphIndex: number;
  chapterTitle: string;
  snippet: string;
  createdAt: string;
}

/** users/{uid}/reflections/{bookId} — answers to reflection questions after finishing. Private. */
export interface Reflection {
  bookId: string;
  bookTitle: string;
  answers: Array<{ question: string; answer: string }>;
  updatedAt: string;
}

export type NotificationType = 'like' | 'comment' | 'follow' | 'message' | 'file' | 'morning';

/** users/{uid}/notifications/{id} — written only by the server. */
export interface AppNotification {
  id: string;
  type: NotificationType;
  actorId?: string;
  actorName?: string;
  actorAvatarUrl?: string;
  postId?: string;
  postTitle?: string;
  conversationId?: string;
  snippet?: string;
  /** Morning reminders: how many ideas are due, and the book in progress. */
  dueCount?: number;
  bookId?: string;
  bookTitle?: string;
  read: boolean;
  createdAt: string;
}

/** users/{uid}/private/notifications — what the user wants to be told about. */
export interface NotificationPrefs {
  morning: boolean;
  /** Local hour (0–23) for the morning reminder. */
  morningHour: number;
  activity: boolean;
  email: boolean;
  timezone: string;
  locale: string;
}

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'hate'
  | 'misinformation'
  | 'copyright'
  | 'sexual'
  | 'violence'
  | 'impersonation'
  | 'self-harm'
  | 'other';

export type ReportTargetType = 'user' | 'post' | 'comment' | 'message';

/** conversations/{uidA_uidB} */
export interface Conversation {
  id: string;
  participantIds: string[];
  lastMessage?: { text: string; senderId: string; createdAt: string };
  updatedAt: string;
}

/** conversations/{id}/messages/{messageId} */
export interface ChatAttachment {
  /** Storage path; files are fetched through the SDK so only the two participants can open them. */
  path: string;
  name: string;
  contentType: string;
  size: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  attachment?: ChatAttachment;
  createdAt: string;
}

export interface NicheTopic {
  id: string;
  name: string;
  emoji: string;
}

export interface Subject {
  id: string;
  name: string;
  emoji: string;
  nicheTopics?: NicheTopic[];
}

export interface AISubjectExplanation {
  explanation: string;
  aiSuggestedBooks?: Array<{ title: string; author?: string }>;
  aiSuggestedSources?: Array<{ title: string; url?: string }>;
}
