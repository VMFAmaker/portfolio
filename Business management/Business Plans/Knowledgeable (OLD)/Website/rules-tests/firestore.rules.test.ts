import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, writeBatch, increment, serverTimestamp, collection, getDocs, query, where,
  type Firestore,
} from 'firebase/firestore';

let env: RulesTestEnvironment;

const ALICE = 'alice-uid';
const BOB = 'bob-uid';
const MALLORY = 'mallory-uid';

function dbFor(uid: string | null, claims: Record<string, unknown> = { email_verified: true }): Firestore {
  return (uid ? env.authenticatedContext(uid, claims) : env.unauthenticatedContext()).firestore() as unknown as Firestore;
}

function profile(name: string, handle: string, extra: Record<string, unknown> = {}) {
  return { displayName: name, nameLower: name.toLowerCase(), handle, interests: ['physics'], readingPublic: true, createdAt: serverTimestamp(), ...extra };
}

function newPost(authorId: string, name: string, handle: string, extra: Record<string, unknown> = {}) {
  return {
    authorId, authorName: name, authorHandle: handle, type: 'idea', title: 'An idea', body: 'Short body',
    topics: ['physics'], keywords: ['idea'], likeCount: 0, createdAt: serverTimestamp(), ...extra,
  };
}

beforeAll(async () => {
  const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080').split(':');
  env = await initializeTestEnvironment({
    projectId: 'demo-knowledgeable-rules',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host, port: Number(port) },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users', ALICE), { ...profile('Alice', 'alice'), createdAt: new Date() });
    await setDoc(doc(db, 'handles', 'alice'), { uid: ALICE });
    await setDoc(doc(db, 'users', BOB), { ...profile('Bob', 'bob'), createdAt: new Date() });
    await setDoc(doc(db, 'handles', 'bob'), { uid: BOB });
    await setDoc(doc(db, 'users', MALLORY), { ...profile('Mallory', 'mallory'), createdAt: new Date() });
    await setDoc(doc(db, 'users', ALICE, 'private', 'account'), { country: 'Portugal', birthYear: 1990 });
    await setDoc(doc(db, 'books', 'meditations'), { title: 'Meditations', author: 'Marcus Aurelius', readable: true, topics: ['philosophy'] });
    await setDoc(doc(db, 'posts', 'post1'), { ...newPost(ALICE, 'Alice', 'alice'), createdAt: new Date() });
    await setDoc(doc(db, 'posts', 'poll1'), {
      ...newPost(ALICE, 'Alice', 'alice', { type: 'poll', poll: { question: 'Best?', options: ['A', 'B'] }, pollCounts: {} }),
      createdAt: new Date(),
    });
    await setDoc(doc(db, 'conversations', `${ALICE}_${BOB}`), { participantIds: [ALICE, BOB], updatedAt: new Date() });
  });
});

describe('signed-out visitors', () => {
  it('cannot read anything', async () => {
    const db = dbFor(null);
    await assertFails(getDoc(doc(db, 'posts', 'post1')));
    await assertFails(getDoc(doc(db, 'users', ALICE)));
    await assertFails(getDoc(doc(db, 'books', 'meditations')));
  });
});

describe('profiles and handles', () => {
  it('lets a new user claim a handle and create their own profile together', async () => {
    const db = dbFor('new-uid');
    const batch = writeBatch(db);
    batch.set(doc(db, 'handles', 'newbie'), { uid: 'new-uid' });
    batch.set(doc(db, 'users', 'new-uid'), profile('Newbie', 'newbie'));
    await assertSucceeds(batch.commit());
  });

  it('rejects taking an existing handle', async () => {
    const db = dbFor('new-uid');
    const batch = writeBatch(db);
    batch.set(doc(db, 'handles', 'alice'), { uid: 'new-uid' });
    batch.set(doc(db, 'users', 'new-uid'), profile('Fake Alice', 'alice'));
    await assertFails(batch.commit());
  });

  it('rejects creating or editing someone else’s profile', async () => {
    const db = dbFor(MALLORY);
    await assertFails(updateDoc(doc(db, 'users', ALICE), { bio: 'hacked' }));
    await assertFails(setDoc(doc(db, 'users', 'victim'), profile('Victim', 'victim')));
  });

  it('does not allow changing the handle later', async () => {
    await assertFails(updateDoc(doc(dbFor(ALICE), 'users', ALICE), { handle: 'someone_else' }));
    await assertSucceeds(updateDoc(doc(dbFor(ALICE), 'users', ALICE), { bio: 'Hello' }));
  });

  it('keeps private account details private', async () => {
    await assertSucceeds(getDoc(doc(dbFor(ALICE), 'users', ALICE, 'private', 'account')));
    await assertFails(getDoc(doc(dbFor(BOB), 'users', ALICE, 'private', 'account')));
    await assertFails(setDoc(doc(dbFor(BOB), 'users', ALICE, 'private', 'account'), { country: 'X' }));
  });
});

describe('posts', () => {
  it('lets a verified user publish as themselves', async () => {
    await assertSucceeds(setDoc(doc(dbFor(BOB), 'posts', 'p-bob'), newPost(BOB, 'Bob', 'bob')));
  });

  it('blocks unverified accounts from publishing', async () => {
    const db = dbFor(BOB, { email_verified: false });
    await assertFails(setDoc(doc(db, 'posts', 'p-bob'), newPost(BOB, 'Bob', 'bob')));
  });

  it('blocks impersonation and tampered fields', async () => {
    const db = dbFor(MALLORY);
    await assertFails(setDoc(doc(db, 'posts', 'fake1'), newPost(ALICE, 'Alice', 'alice')));
    await assertFails(setDoc(doc(db, 'posts', 'fake2'), newPost(MALLORY, 'Alice', 'mallory')));
    await assertFails(setDoc(doc(db, 'posts', 'fake3'), newPost(MALLORY, 'Mallory', 'mallory', { likeCount: 9999 })));
    await assertFails(setDoc(doc(db, 'posts', 'fake4'), newPost(MALLORY, 'Mallory', 'mallory', { isAdmin: true })));
    await assertFails(setDoc(doc(db, 'posts', 'fake5'), newPost(MALLORY, 'Mallory', 'mallory', { topics: ['not-a-topic'] })));
    await assertFails(setDoc(doc(db, 'posts', 'fake6'), newPost(MALLORY, 'Mallory', 'mallory', { body: 'x'.repeat(601) })));
    await assertFails(setDoc(doc(db, 'posts', 'fake7'), newPost(MALLORY, 'Mallory', 'mallory', { media: { imageUrl: 'https://evil.example/x.png' } })));
  });

  it('only lets the author edit or delete a post', async () => {
    await assertFails(updateDoc(doc(dbFor(MALLORY), 'posts', 'post1'), { title: 'defaced' }));
    await assertFails(deleteDoc(doc(dbFor(MALLORY), 'posts', 'post1')));
    await assertSucceeds(updateDoc(doc(dbFor(ALICE), 'posts', 'post1'), { title: 'Edited' }));
    await assertSucceeds(deleteDoc(doc(dbFor(ALICE), 'posts', 'post1')));
  });
});

describe('likes', () => {
  it('accepts a like together with a +1 counter update, and the matching unlike', async () => {
    const db = dbFor(BOB);
    const like = writeBatch(db);
    like.set(doc(db, 'posts', 'post1', 'likes', BOB), { uid: BOB, createdAt: serverTimestamp() });
    like.update(doc(db, 'posts', 'post1'), { likeCount: increment(1) });
    await assertSucceeds(like.commit());

    const unlike = writeBatch(db);
    unlike.delete(doc(db, 'posts', 'post1', 'likes', BOB));
    unlike.update(doc(db, 'posts', 'post1'), { likeCount: increment(-1) });
    await assertSucceeds(unlike.commit());
  });

  it('rejects inflating the counter', async () => {
    const db = dbFor(MALLORY);
    await assertFails(updateDoc(doc(db, 'posts', 'post1'), { likeCount: increment(1) }));
    const batch = writeBatch(db);
    batch.set(doc(db, 'posts', 'post1', 'likes', MALLORY), { uid: MALLORY, createdAt: serverTimestamp() });
    batch.update(doc(db, 'posts', 'post1'), { likeCount: increment(50) });
    await assertFails(batch.commit());
  });

  it('rejects liking on behalf of someone else', async () => {
    const db = dbFor(MALLORY);
    const batch = writeBatch(db);
    batch.set(doc(db, 'posts', 'post1', 'likes', BOB), { uid: BOB, createdAt: serverTimestamp() });
    batch.update(doc(db, 'posts', 'post1'), { likeCount: increment(1) });
    await assertFails(batch.commit());
  });
});

describe('poll votes', () => {
  function vote(db: Firestore, uid: string, option: number, bump = 1, key = String(option)) {
    const batch = writeBatch(db);
    batch.set(doc(db, 'posts', 'poll1', 'votes', uid), { uid, option, createdAt: serverTimestamp() });
    batch.update(doc(db, 'posts', 'poll1'), { [`pollCounts.${key}`]: increment(bump) });
    return batch.commit();
  }

  it('allows exactly one vote per person', async () => {
    await assertSucceeds(vote(dbFor(BOB), BOB, 1));
    await assertFails(vote(dbFor(BOB), BOB, 0));
  });

  it('rejects stuffing, invalid options and mismatched tallies', async () => {
    await assertFails(vote(dbFor(MALLORY), MALLORY, 0, 10));
    await assertFails(vote(dbFor(MALLORY), MALLORY, 5));
    await assertFails(vote(dbFor(MALLORY), MALLORY, 0, 1, '1'));
    await assertFails(updateDoc(doc(dbFor(MALLORY), 'posts', 'poll1'), { 'pollCounts.0': increment(1) }));
  });

  it('keeps each vote private to the voter', async () => {
    await vote(dbFor(BOB), BOB, 1);
    await assertSucceeds(getDoc(doc(dbFor(BOB), 'posts', 'poll1', 'votes', BOB)));
    await assertFails(getDoc(doc(dbFor(ALICE), 'posts', 'poll1', 'votes', BOB)));
  });
});

describe('comments', () => {
  const comment = (uid: string, name: string) => ({ authorId: uid, authorName: name, text: 'Nice', createdAt: serverTimestamp() });

  it('allows commenting as yourself only', async () => {
    await assertSucceeds(setDoc(doc(dbFor(BOB), 'posts', 'post1', 'comments', 'c1'), comment(BOB, 'Bob')));
    await assertFails(setDoc(doc(dbFor(MALLORY), 'posts', 'post1', 'comments', 'c2'), comment(BOB, 'Bob')));
  });

  it('lets the comment author or post author delete, nobody else', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'posts', 'post1', 'comments', 'c1'), { ...comment(BOB, 'Bob'), createdAt: new Date() });
    });
    await assertFails(deleteDoc(doc(dbFor(MALLORY), 'posts', 'post1', 'comments', 'c1')));
    await assertSucceeds(deleteDoc(doc(dbFor(ALICE), 'posts', 'post1', 'comments', 'c1')));
  });
});

describe('reading library', () => {
  const entry = { bookId: 'meditations', status: 'reading', progress: 0.3, chapterIndex: 2, chapterProgress: 0.5,
    finishedInApp: false, bookTitle: 'Meditations', bookAuthor: 'Marcus Aurelius', updatedAt: serverTimestamp() };

  it('owner can track books that exist in the catalog', async () => {
    await assertSucceeds(setDoc(doc(dbFor(ALICE), 'users', ALICE, 'library', 'meditations'), entry));
    await assertFails(setDoc(doc(dbFor(ALICE), 'users', ALICE, 'library', 'not-a-book'), { ...entry, bookId: 'not-a-book' }));
    await assertFails(setDoc(doc(dbFor(ALICE), 'users', ALICE, 'library', 'meditations'), { ...entry, progress: 7 }));
  });

  it('nobody else can write it, and reading respects the privacy toggle', async () => {
    await assertFails(setDoc(doc(dbFor(MALLORY), 'users', ALICE, 'library', 'meditations'), entry));
    await assertSucceeds(getDocs(collection(dbFor(BOB), 'users', ALICE, 'library')));
    await updateDoc(doc(dbFor(ALICE), 'users', ALICE), { readingPublic: false });
    await assertFails(getDocs(collection(dbFor(BOB), 'users', ALICE, 'library')));
    await assertSucceeds(getDocs(collection(dbFor(ALICE), 'users', ALICE, 'library')));
  });

  it('saved items are private', async () => {
    const saved = { postId: 'post1', postTitle: 'An idea', postType: 'idea', savedAt: serverTimestamp(), reviewStage: 0, nextReviewAt: new Date() };
    await assertSucceeds(setDoc(doc(dbFor(ALICE), 'users', ALICE, 'saved', 'post1'), saved));
    await assertFails(getDoc(doc(dbFor(BOB), 'users', ALICE, 'saved', 'post1')));
  });
});

describe('follows', () => {
  it('requires both edges in one batch', async () => {
    const db = dbFor(BOB);
    await assertFails(setDoc(doc(db, 'users', BOB, 'following', ALICE), { uid: ALICE, createdAt: serverTimestamp() }));
    const batch = writeBatch(db);
    batch.set(doc(db, 'users', BOB, 'following', ALICE), { uid: ALICE, createdAt: serverTimestamp() });
    batch.set(doc(db, 'users', ALICE, 'followers', BOB), { uid: BOB, createdAt: serverTimestamp() });
    await assertSucceeds(batch.commit());
  });

  it('prevents forging someone else’s follow', async () => {
    const db = dbFor(MALLORY);
    const batch = writeBatch(db);
    batch.set(doc(db, 'users', BOB, 'following', ALICE), { uid: ALICE, createdAt: serverTimestamp() });
    batch.set(doc(db, 'users', ALICE, 'followers', BOB), { uid: BOB, createdAt: serverTimestamp() });
    await assertFails(batch.commit());
  });
});

describe('direct messages', () => {
  const convo = `${ALICE}_${BOB}`;

  it('only participants can read a conversation', async () => {
    await assertSucceeds(getDoc(doc(dbFor(ALICE), 'conversations', convo)));
    await assertFails(getDoc(doc(dbFor(MALLORY), 'conversations', convo)));
    await assertFails(getDocs(collection(dbFor(MALLORY), 'conversations', convo, 'messages')));
    await assertSucceeds(getDocs(query(collection(dbFor(BOB), 'conversations'), where('participantIds', 'array-contains', BOB))));
    await assertFails(getDocs(collection(dbFor(MALLORY), 'conversations')));
  });

  it('participants can send messages as themselves only', async () => {
    const msg = (sender: string) => ({ senderId: sender, text: 'hi', createdAt: serverTimestamp() });
    await assertSucceeds(setDoc(doc(dbFor(BOB), 'conversations', convo, 'messages', 'm1'), msg(BOB)));
    await assertFails(setDoc(doc(dbFor(BOB), 'conversations', convo, 'messages', 'm2'), msg(ALICE)));
    await assertFails(setDoc(doc(dbFor(MALLORY), 'conversations', convo, 'messages', 'm3'), msg(MALLORY)));
  });

  it('conversation ids must be the sorted pair and include the creator', async () => {
    const create = (uid: string, ids: string[], id: string) =>
      setDoc(doc(dbFor(uid), 'conversations', id), { participantIds: ids, updatedAt: serverTimestamp() });
    await assertSucceeds(create(BOB, [BOB, MALLORY].sort(), [BOB, MALLORY].sort().join('_')));
    await assertFails(create(MALLORY, [ALICE, BOB], `${ALICE}_${BOB}x`));
    await assertFails(create(MALLORY, [ALICE, BOB].sort(), [ALICE, BOB].sort().join('_') + '2'));
  });
});

describe('book catalog', () => {
  it('is read-only except for admins', async () => {
    await assertSucceeds(getDoc(doc(dbFor(BOB), 'books', 'meditations')));
    await assertFails(setDoc(doc(dbFor(BOB), 'books', 'pirated'), { title: 'Pirated', readable: true }));
    await assertSucceeds(setDoc(doc(dbFor(BOB, { admin: true, email_verified: true }), 'books', 'new'), { title: 'New', readable: false }));
  });
});

describe('blocking', () => {
  const convo = `${ALICE}_${BOB}`;
  const block = (me: string, target: string) =>
    setDoc(doc(dbFor(me), 'users', me, 'blocked', target), { uid: target, createdAt: serverTimestamp() });

  it('only the owner can see or change their block list', async () => {
    await assertSucceeds(block(ALICE, BOB));
    await assertSucceeds(getDoc(doc(dbFor(ALICE), 'users', ALICE, 'blocked', BOB)));
    await assertFails(getDoc(doc(dbFor(BOB), 'users', ALICE, 'blocked', BOB)));
    await assertFails(setDoc(doc(dbFor(BOB), 'users', ALICE, 'blocked', MALLORY), { uid: MALLORY, createdAt: serverTimestamp() }));
    await assertFails(block(ALICE, ALICE));
  });

  it('blocked people cannot message, comment or follow', async () => {
    await assertSucceeds(block(ALICE, BOB));
    await assertFails(setDoc(doc(dbFor(BOB), 'conversations', convo, 'messages', 'm1'), { senderId: BOB, text: 'hi', createdAt: serverTimestamp() }));
    // ...and the blocker can't message them either until they unblock.
    await assertFails(setDoc(doc(dbFor(ALICE), 'conversations', convo, 'messages', 'm2'), { senderId: ALICE, text: 'hi', createdAt: serverTimestamp() }));
    await assertFails(setDoc(doc(dbFor(BOB), 'posts', 'post1', 'comments', 'c1'), { authorId: BOB, authorName: 'Bob', text: 'hey', createdAt: serverTimestamp() }));
    const db = dbFor(BOB);
    const batch = writeBatch(db);
    batch.set(doc(db, 'users', BOB, 'following', ALICE), { uid: ALICE, createdAt: serverTimestamp() });
    batch.set(doc(db, 'users', ALICE, 'followers', BOB), { uid: BOB, createdAt: serverTimestamp() });
    await assertFails(batch.commit());
    // Others are unaffected.
    await assertSucceeds(setDoc(doc(dbFor(MALLORY), 'posts', 'post1', 'comments', 'c2'), { authorId: MALLORY, authorName: 'Mallory', text: 'hey', createdAt: serverTimestamp() }));
  });

  it('blocking removes follows in both directions in one batch', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'users', BOB, 'following', ALICE), { uid: ALICE, createdAt: new Date() });
      await setDoc(doc(db, 'users', ALICE, 'followers', BOB), { uid: BOB, createdAt: new Date() });
    });
    const db = dbFor(ALICE);
    const batch = writeBatch(db);
    batch.set(doc(db, 'users', ALICE, 'blocked', BOB), { uid: BOB, createdAt: serverTimestamp() });
    batch.delete(doc(db, 'users', ALICE, 'following', BOB));
    batch.delete(doc(db, 'users', BOB, 'followers', ALICE));
    batch.delete(doc(db, 'users', BOB, 'following', ALICE));
    batch.delete(doc(db, 'users', ALICE, 'followers', BOB));
    await assertSucceeds(batch.commit());
  });
});

describe('chat attachments', () => {
  const convo = `${ALICE}_${BOB}`;
  const withFile = (sender: string, path: string, extra: Record<string, unknown> = {}) => ({
    senderId: sender, text: '', createdAt: serverTimestamp(),
    attachment: { path, name: 'notes.pdf', contentType: 'application/pdf', size: 1234 }, ...extra,
  });

  it('accepts a file in the sender’s own chat folder, with or without a caption', async () => {
    await assertSucceeds(setDoc(doc(dbFor(BOB), 'conversations', convo, 'messages', 'f1'), withFile(BOB, `chats/${convo}/${BOB}/f1-notes.pdf`)));
    await assertSucceeds(setDoc(doc(dbFor(BOB), 'conversations', convo, 'messages', 'f2'), withFile(BOB, `chats/${convo}/${BOB}/f2-notes.pdf`, { text: 'Chapter 3' })));
  });

  it('rejects files pointing at someone else’s folder or another chat', async () => {
    await assertFails(setDoc(doc(dbFor(BOB), 'conversations', convo, 'messages', 'f3'), withFile(BOB, `chats/${convo}/${ALICE}/x.pdf`)));
    await assertFails(setDoc(doc(dbFor(BOB), 'conversations', convo, 'messages', 'f4'), withFile(BOB, `chats/other_chat/${BOB}/x.pdf`)));
    await assertFails(setDoc(doc(dbFor(BOB), 'conversations', convo, 'messages', 'f5'), { senderId: BOB, text: '', createdAt: serverTimestamp() }));
  });
});

describe('reading notes', () => {
  const highlight = (extra: Record<string, unknown> = {}) => ({
    bookId: 'meditations', bookTitle: 'Meditations', chapterIndex: 0, paragraphIndex: 3, start: 0, end: 12,
    quote: 'Begin the day', colour: 'yellow', createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...extra,
  });

  it('highlights and notes are private to their owner', async () => {
    await assertSucceeds(setDoc(doc(dbFor(ALICE), 'users', ALICE, 'annotations', 'a1'), highlight({ note: 'Stoic morning routine' })));
    await assertFails(getDoc(doc(dbFor(BOB), 'users', ALICE, 'annotations', 'a1')));
    await assertFails(setDoc(doc(dbFor(BOB), 'users', ALICE, 'annotations', 'a2'), highlight()));
    await assertSucceeds(updateDoc(doc(dbFor(ALICE), 'users', ALICE, 'annotations', 'a1'), { note: 'Edited', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(dbFor(ALICE), 'users', ALICE, 'annotations', 'a1'), { bookId: 'other', updatedAt: serverTimestamp() }));
  });

  it('validates highlights', async () => {
    await assertFails(setDoc(doc(dbFor(ALICE), 'users', ALICE, 'annotations', 'a3'), highlight({ colour: 'red' })));
    await assertFails(setDoc(doc(dbFor(ALICE), 'users', ALICE, 'annotations', 'a4'), highlight({ start: 10, end: 5 })));
    await assertFails(setDoc(doc(dbFor(ALICE), 'users', ALICE, 'annotations', 'a5'), highlight({ note: 'x'.repeat(2001) })));
  });

  it('bookmarks use a predictable id and are private', async () => {
    const mark = { bookId: 'meditations', bookTitle: 'Meditations', chapterIndex: 2, paragraphIndex: 7, chapterTitle: 'Book II', snippet: 'Begin', createdAt: serverTimestamp() };
    await assertSucceeds(setDoc(doc(dbFor(ALICE), 'users', ALICE, 'bookmarks', 'meditations_2_7'), mark));
    await assertFails(setDoc(doc(dbFor(ALICE), 'users', ALICE, 'bookmarks', 'random-id'), mark));
    await assertFails(getDoc(doc(dbFor(BOB), 'users', ALICE, 'bookmarks', 'meditations_2_7')));
  });

  it('reflections are private', async () => {
    const reflection = { bookTitle: 'Meditations', answers: [{ question: 'What stuck?', answer: 'Control what you can.' }], updatedAt: serverTimestamp() };
    await assertSucceeds(setDoc(doc(dbFor(ALICE), 'users', ALICE, 'reflections', 'meditations'), reflection));
    await assertFails(getDoc(doc(dbFor(BOB), 'users', ALICE, 'reflections', 'meditations')));
  });
});

describe('notifications', () => {
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'notifications', 'n1'), { type: 'like', actorId: BOB, read: false, createdAt: new Date() });
    });
  });

  it('only the server creates notifications; owners can read, mark read and remove them', async () => {
    await assertFails(setDoc(doc(dbFor(BOB), 'users', ALICE, 'notifications', 'fake'), { type: 'like', read: false, createdAt: serverTimestamp() }));
    await assertFails(setDoc(doc(dbFor(ALICE), 'users', ALICE, 'notifications', 'mine'), { type: 'like', read: false, createdAt: serverTimestamp() }));
    await assertSucceeds(getDoc(doc(dbFor(ALICE), 'users', ALICE, 'notifications', 'n1')));
    await assertFails(getDoc(doc(dbFor(BOB), 'users', ALICE, 'notifications', 'n1')));
    await assertFails(updateDoc(doc(dbFor(ALICE), 'users', ALICE, 'notifications', 'n1'), { actorId: MALLORY }));
    await assertSucceeds(updateDoc(doc(dbFor(ALICE), 'users', ALICE, 'notifications', 'n1'), { read: true }));
    await assertSucceeds(deleteDoc(doc(dbFor(ALICE), 'users', ALICE, 'notifications', 'n1')));
  });

  it('settings and devices are private and validated', async () => {
    const prefs = { morning: true, morningHour: 8, activity: true, email: false, timezone: 'Europe/Lisbon', locale: 'en-GB' };
    await assertSucceeds(setDoc(doc(dbFor(ALICE), 'users', ALICE, 'private', 'notifications'), prefs));
    await assertFails(setDoc(doc(dbFor(ALICE), 'users', ALICE, 'private', 'notifications'), { ...prefs, morningHour: 25 }));
    await assertFails(setDoc(doc(dbFor(BOB), 'users', ALICE, 'private', 'notifications'), prefs));
    const device = { token: 'fcm-token', platform: 'installed', userAgent: 'test', updatedAt: serverTimestamp() };
    await assertSucceeds(setDoc(doc(dbFor(ALICE), 'users', ALICE, 'devices', 'a'.repeat(40)), device));
    await assertFails(setDoc(doc(dbFor(BOB), 'users', ALICE, 'devices', 'b'.repeat(40)), device));
    await assertFails(getDoc(doc(dbFor(BOB), 'users', ALICE, 'devices', 'a'.repeat(40))));
  });

  it('the email outbox is closed to clients', async () => {
    await assertFails(setDoc(doc(dbFor(ALICE), 'mail', 'm1'), { to: 'someone@example.com', message: { subject: 'Hi', text: 'Spam' } }));
  });
});

describe('reports', () => {
  const report = (reporter: string, extra: Record<string, unknown> = {}) => ({
    reporterId: reporter, targetType: 'post', targetId: 'post1', targetUserId: ALICE, reason: 'spam',
    details: 'Advertising', evidence: 'Same link posted 10 times', evidenceFiles: [], status: 'open', createdAt: serverTimestamp(), ...extra,
  });

  it('anyone can file a report as themselves, but nobody except admins can read reports', async () => {
    await assertSucceeds(setDoc(doc(dbFor(BOB), 'reports', 'r1'), report(BOB)));
    await assertFails(getDoc(doc(dbFor(BOB), 'reports', 'r1')));
    await assertFails(getDoc(doc(dbFor(ALICE), 'reports', 'r1')));
    await assertSucceeds(getDoc(doc(dbFor(MALLORY, { admin: true }), 'reports', 'r1')));
  });

  it('rejects forged, self-targeted or invalid reports', async () => {
    await assertSucceeds(setDoc(doc(dbFor(BOB), 'reports', 'r1'), report(BOB)));
    await assertFails(setDoc(doc(dbFor(BOB), 'reports', 'r2'), report(MALLORY)));
    await assertFails(setDoc(doc(dbFor(ALICE), 'reports', 'r3'), report(ALICE)));
    await assertFails(setDoc(doc(dbFor(BOB), 'reports', 'r4'), report(BOB, { reason: 'dislike' })));
    await assertFails(setDoc(doc(dbFor(BOB), 'reports', 'r5'), report(BOB, { status: 'resolved' })));
    await assertFails(updateDoc(doc(dbFor(BOB), 'reports', 'r1'), { status: 'closed' }));
  });
});
