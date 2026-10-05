/**
 * Seeds the Knowledgeable database.
 *
 *   npm run seed                      → local emulators: catalog + demo users/posts
 *   npm run seed -- --prod            → real project: book catalog only (never demo users)
 *   npm run seed -- --admin <email>   → grant the admin claim (can manage the catalog)
 *   add --skip-download               → don't fetch book texts from Project Gutenberg
 *
 * Runs with the Firebase Admin SDK, which bypasses security rules — keep it off servers.
 */
import { config } from 'dotenv';
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { splitIntoSections, stripGutenbergBoilerplate } from './lib/gutenberg';
import { DEMO_POSTS, DEMO_USERS, OPEN_PAPERS, READABLE_BOOKS, TRACK_ONLY_BOOKS, WIKIPEDIA_ARTICLES } from './seed-data';

config({ path: '.env.local' });
config();

const args = process.argv.slice(2);
const isEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const prod = args.includes('--prod');
const skipDownload = args.includes('--skip-download');
const adminEmail = args.includes('--admin') ? args[args.indexOf('--admin') + 1] : undefined;

/** Emulator-only password shared by the demo accounts (they cannot exist in production). */
const DEMO_PASSWORD = 'knowledgeable-demo-1';

if (!isEmulator && !prod) {
  console.error('FIRESTORE_EMULATOR_HOST is not set. To seed the REAL project, re-run with --prod.');
  process.exit(1);
}
if (isEmulator && !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error('Set FIREBASE_AUTH_EMULATOR_HOST too, so demo users are created in the emulator (never in production).');
  process.exit(1);
}

const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET ?? process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
initializeApp(
  isEmulator
    ? { projectId, storageBucket }
    : {
        projectId,
        storageBucket,
        credential: process.env.FIREBASE_SERVICE_ACCOUNT_KEY
          ? cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY))
          : applicationDefault(),
      }
);
const db = getFirestore();
const auth = getAuth();

async function fetchGutenbergText(gutenbergId: number): Promise<string> {
  const url = `https://www.gutenberg.org/cache/epub/${gutenbergId}/pg${gutenbergId}.txt`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Knowledgeable-seed/1.0 (one-off catalog import)' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function seedReadableBooks(database: Firestore) {
  for (const book of READABLE_BOOKS) {
    const ref = database.collection('books').doc(book.id);
    const existing = await ref.get();
    if (existing.exists && existing.get('readable') === true) {
      console.log(`  ✓ ${book.title} (already imported)`);
      continue;
    }
    if (skipDownload) {
      console.log(`  - ${book.title} skipped (--skip-download)`);
      continue;
    }
    try {
      const raw = await fetchGutenbergText(book.gutenbergId);
      const titleLine = raw.match(/^Title:\s*(.+)$/im)?.[1] ?? '';
      if (!titleLine.toLowerCase().includes(book.expectTitle.toLowerCase())) {
        console.warn(`  ! ${book.title}: Gutenberg #${book.gutenbergId} is "${titleLine}" — skipped`);
        continue;
      }
      const sections = splitIntoSections(stripGutenbergBoilerplate(raw));
      const batch = database.batch();
      sections.forEach((section, index) => {
        batch.set(ref.collection('chapters').doc(String(index)), { index, ...section });
      });
      batch.set(ref, {
        title: book.title,
        author: book.author,
        description: book.description,
        publishedYear: book.publishedYear,
        topics: book.topics,
        readable: true,
        license: 'public-domain',
        sourceUrl: `https://www.gutenberg.org/ebooks/${book.gutenbergId}`,
        chapterCount: sections.length,
        wordCount: sections.reduce<number>((sum, s) => sum + s.wordCount, 0),
      });
      await batch.commit();
      console.log(`  ✓ ${book.title}: ${sections.length} sections`);
    } catch (error) {
      console.warn(`  ! ${book.title}: ${(error as Error).message}`);
    }
  }
}

async function seedTrackOnlyBooks(database: Firestore) {
  const batch = database.batch();
  for (const book of TRACK_ONLY_BOOKS) {
    const { id, ...data } = book;
    batch.set(database.collection('books').doc(id), { ...data, readable: false, license: 'metadata-only' }, { merge: true });
  }
  await batch.commit();
  console.log(`  ✓ ${TRACK_ONLY_BOOKS.length} track-only books`);
}

function keywordsFor(...texts: Array<string | undefined>): string[] {
  const stop = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'into', 'are', 'was', 'its', 'of', 'to', 'in', 'on', 'an', 'is', 'my', 'a']);
  const words = new Set<string>();
  for (const t of texts) {
    for (const w of (t ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').split(/[^\p{L}\p{N}]+/u)) {
      if (w.length >= 2 && !stop.has(w)) words.add(w);
    }
  }
  return Array.from(words).slice(0, 40);
}

async function seedDemo(database: Firestore) {
  const uids: Record<string, string> = {};
  for (const u of DEMO_USERS) {
    let uid: string;
    try {
      uid = (await auth.getUserByEmail(u.email)).uid;
    } catch {
      uid = (await auth.createUser({ email: u.email, password: DEMO_PASSWORD, displayName: u.displayName, emailVerified: true })).uid;
    }
    uids[u.key] = uid;
    await database.collection('handles').doc(u.handle).set({ uid });
    await database.collection('users').doc(uid).set({
      displayName: u.displayName,
      nameLower: u.displayName.toLowerCase(),
      handle: u.handle,
      bio: u.bio,
      interests: u.interests,
      readingPublic: true,
      createdAt: Timestamp.now(),
    });
  }
  console.log(`  ✓ ${DEMO_USERS.length} demo users (password: ${DEMO_PASSWORD})`);

  const existingPosts = await database.collection('posts').limit(1).get();
  if (existingPosts.empty) {
    for (const p of DEMO_POSTS) {
      const author = DEMO_USERS.find((u) => u.key === p.author)!;
      const data: Record<string, unknown> = {
        authorId: uids[p.author],
        authorName: author.displayName,
        authorHandle: author.handle,
        type: p.type,
        title: p.title,
        body: p.body,
        topics: p.topics,
        keywords: keywordsFor(p.title, p.source?.title, ...(p.authors ?? [])),
        likeCount: 0,
        createdAt: Timestamp.fromMillis(Date.now() - p.hoursAgo * 3600_000),
      };
      if (p.source) data.source = p.source;
      if (p.authors) data.authors = p.authors;
      if (p.poll) {
        data.poll = { question: p.poll.question, options: p.poll.options };
        data.pollCounts = Object.fromEntries((p.poll.counts ?? []).map((c, i) => [String(i), c]));
      }
      await database.collection('posts').add(data);
    }
    console.log(`  ✓ ${DEMO_POSTS.length} demo posts`);
  } else {
    console.log('  ✓ posts already present — skipped');
  }

  // Alice is halfway through Meditations and finished Flatland in the reader.
  const alice = uids.alice;
  const library = database.collection('users').doc(alice).collection('library');
  const now = Timestamp.now();
  await library.doc('meditations').set({
    bookId: 'meditations', status: 'reading', progress: 0.35, chapterIndex: 4, chapterProgress: 0.2, finishedInApp: false,
    bookTitle: 'Meditations', bookAuthor: 'Marcus Aurelius (trans. George Long)', startedAt: now, updatedAt: now,
  });
  await library.doc('flatland').set({
    bookId: 'flatland', status: 'finished', progress: 1, chapterIndex: 0, chapterProgress: 1, finishedInApp: true,
    bookTitle: 'Flatland: A Romance of Many Dimensions', bookAuthor: 'Edwin A. Abbott', startedAt: now, finishedAt: now, updatedAt: now,
  });
  await library.doc('book2').set({
    bookId: 'book2', status: 'want', progress: 0, chapterIndex: 0, chapterProgress: 0, finishedInApp: false,
    bookTitle: 'Sapiens: A Brief History of Humankind', bookAuthor: 'Yuval Noah Harari', updatedAt: now,
  });
  console.log('  ✓ demo reading lists');
}

/** Papers and articles, imported with the same code the app uses (src/lib/server/library-import.ts). */
async function seedOpenWorks(database: Firestore) {
  const { importEuropePmc, importWikipedia } = await import('../src/lib/server/library-import');
  for (const pmcid of OPEN_PAPERS) {
    if ((await database.doc(`books/pmc-${pmcid}`).get()).exists) {
      console.log(`  ✓ ${pmcid} (already imported)`);
      continue;
    }
    try {
      await importEuropePmc(pmcid);
      console.log(`  ✓ paper ${pmcid}`);
    } catch (error) {
      console.warn(`  ! paper ${pmcid} skipped: ${(error as Error).message}`);
    }
  }
  for (const article of WIKIPEDIA_ARTICLES) {
    try {
      const id = await importWikipedia(article.lang, article.title);
      console.log(`  ✓ article ${article.title} (${id})`);
    } catch (error) {
      console.warn(`  ! article ${article.title} skipped: ${(error as Error).message}`);
    }
  }
}

async function main() {
  console.log(`Seeding ${isEmulator ? 'LOCAL EMULATOR' : `PRODUCTION project ${projectId}`}…`);
  console.log('Books:');
  await seedTrackOnlyBooks(db);
  await seedReadableBooks(db);
  if (!skipDownload) {
    console.log('Papers and articles:');
    await seedOpenWorks(db);
  }
  if (isEmulator) {
    console.log('Demo data:');
    await seedDemo(db);
  }
  if (adminEmail) {
    const user = await auth.getUserByEmail(adminEmail);
    await auth.setCustomUserClaims(user.uid, { ...(user.customClaims ?? {}), admin: true });
    console.log(`Granted admin to ${adminEmail} (takes effect at their next sign-in).`);
  }
  console.log('Done.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
