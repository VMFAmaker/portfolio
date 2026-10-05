import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { ref, uploadBytes, getBytes, type FirebaseStorage } from 'firebase/storage';

let env: RulesTestEnvironment;
const ALICE = 'alice-uid';
const MALLORY = 'mallory-uid';

function storageFor(uid: string | null, claims: Record<string, unknown> = { email_verified: true }): FirebaseStorage {
  return (uid ? env.authenticatedContext(uid, claims) : env.unauthenticatedContext()).storage() as unknown as FirebaseStorage;
}

const bytes = (n: number) => new Uint8Array(n);

beforeAll(async () => {
  const [host, port] = (process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? '127.0.0.1:9199').split(':');
  env = await initializeTestEnvironment({
    projectId: 'demo-knowledgeable-rules',
    storage: { rules: readFileSync('storage.rules', 'utf8'), host, port: Number(port) },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

describe('storage rules', () => {
  it('lets users upload allowed files into their own folders', async () => {
    const s = storageFor(ALICE);
    await assertSucceeds(uploadBytes(ref(s, `users/${ALICE}/avatar/a.png`), bytes(1000), { contentType: 'image/png' }));
    await assertSucceeds(uploadBytes(ref(s, `posts/${ALICE}/p1/video.mp4`), bytes(1000), { contentType: 'video/mp4' }));
    await assertSucceeds(uploadBytes(ref(s, `posts/${ALICE}/p1/paper.pdf`), bytes(1000), { contentType: 'application/pdf' }));
  });

  it('rejects uploads into another user’s folder', async () => {
    await assertFails(uploadBytes(ref(storageFor(MALLORY), `posts/${ALICE}/p1/evil.png`), bytes(10), { contentType: 'image/png' }));
    await assertFails(uploadBytes(ref(storageFor(MALLORY), `users/${ALICE}/avatar/evil.png`), bytes(10), { contentType: 'image/png' }));
  });

  it('rejects dangerous types, oversized files and unverified users', async () => {
    const s = storageFor(ALICE);
    await assertFails(uploadBytes(ref(s, `posts/${ALICE}/p1/page.html`), bytes(10), { contentType: 'text/html' }));
    await assertFails(uploadBytes(ref(s, `posts/${ALICE}/p1/app.svg`), bytes(10), { contentType: 'image/svg+xml' }));
    await assertFails(uploadBytes(ref(s, `users/${ALICE}/avatar/huge.png`), bytes(6 * 1024 * 1024), { contentType: 'image/png' }));
    await assertFails(uploadBytes(ref(storageFor(ALICE, { email_verified: false }), `posts/${ALICE}/p2/x.png`), bytes(10), { contentType: 'image/png' }));
  });

  it('files are not readable when signed out', async () => {
    await assertFails(getBytes(ref(storageFor(null), `users/${ALICE}/avatar/a.png`)));
  });
});

describe('chat files and report evidence', () => {
  const BOB = 'bob-uid';
  const convo = [ALICE, BOB].sort().join('_');

  it('only the two people in a chat can share and open its files', async () => {
    await assertSucceeds(uploadBytes(ref(storageFor(BOB), `chats/${convo}/${BOB}/m1-notes.pdf`), bytes(1000), { contentType: 'application/pdf' }));
    await assertSucceeds(getBytes(ref(storageFor(ALICE), `chats/${convo}/${BOB}/m1-notes.pdf`)));
    await assertFails(getBytes(ref(storageFor(MALLORY), `chats/${convo}/${BOB}/m1-notes.pdf`)));
    await assertFails(uploadBytes(ref(storageFor(MALLORY), `chats/${convo}/${MALLORY}/x.pdf`), bytes(10), { contentType: 'application/pdf' }));
    await assertFails(uploadBytes(ref(storageFor(ALICE), `chats/${convo}/${BOB}/x.pdf`), bytes(10), { contentType: 'application/pdf' }));
    await assertFails(uploadBytes(ref(storageFor(BOB), `chats/${convo}/${BOB}/x.html`), bytes(10), { contentType: 'text/html' }));
  });

  it('report evidence is write-only for the reporter', async () => {
    await assertSucceeds(uploadBytes(ref(storageFor(BOB), `reports/${BOB}/r1/0-shot.png`), bytes(100), { contentType: 'image/png' }));
    await assertFails(getBytes(ref(storageFor(BOB), `reports/${BOB}/r1/0-shot.png`)));
    await assertFails(uploadBytes(ref(storageFor(MALLORY), `reports/${BOB}/r1/1-shot.png`), bytes(100), { contentType: 'image/png' }));
  });

  it('nobody can read the library’s source files directly', async () => {
    await assertFails(getBytes(ref(storageFor(ALICE), 'library/meditations/source.txt')));
  });
});
