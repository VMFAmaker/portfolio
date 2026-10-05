import 'server-only';

import { FieldValue, type Query } from 'firebase-admin/firestore';
import { adminAuth, adminDb, adminStorage } from '@/lib/firebase/admin';

async function deleteQueryResults(query: Query, onEach?: (ref: FirebaseFirestore.DocumentReference) => Promise<void>) {
  const snap = await query.get();
  for (const doc of snap.docs) {
    if (onEach) await onEach(doc.ref);
    await doc.ref.delete();
  }
}

/**
 * Erases everything a user owns ("right to erasure"). Runs with admin privileges, so it is only
 * reachable through /api/account after the server has verified a fresh sign-in.
 *
 * Poll vote *tallies* are kept (they are anonymous aggregates); the individual vote records are removed.
 */
export async function deleteUserAndData(uid: string): Promise<void> {
  const db = adminDb();
  const userRef = db.collection('users').doc(uid);
  const profile = await userRef.get();

  // Posts the user authored, including their comments/likes/votes subcollections.
  const posts = await db.collection('posts').where('authorId', '==', uid).get();
  for (const post of posts.docs) await db.recursiveDelete(post.ref);

  // The user's activity on other people's posts.
  await deleteQueryResults(db.collectionGroup('comments').where('authorId', '==', uid));
  await deleteQueryResults(db.collectionGroup('likes').where('uid', '==', uid), async (likeRef) => {
    const postRef = likeRef.parent.parent;
    if (postRef) await postRef.update({ likeCount: FieldValue.increment(-1) }).catch(() => undefined);
  });
  await deleteQueryResults(db.collectionGroup('votes').where('uid', '==', uid));

  // Follow edges stored under other users.
  await deleteQueryResults(db.collectionGroup('followers').where('uid', '==', uid));
  const following = await userRef.collection('following').get();
  for (const edge of following.docs) {
    await db.collection('users').doc(edge.id).collection('followers').doc(uid).delete();
  }

  // Direct message threads the user took part in.
  const conversations = await db.collection('conversations').where('participantIds', 'array-contains', uid).get();
  for (const convo of conversations.docs) await db.recursiveDelete(convo.ref);

  // Handle reservation, then the profile with all private subcollections (library, saved, private...).
  const handle = profile.get('handle');
  if (typeof handle === 'string' && handle) {
    const handleRef = db.collection('handles').doc(handle);
    const handleDoc = await handleRef.get();
    if (handleDoc.get('uid') === uid) await handleRef.delete();
  }
  await db.recursiveDelete(userRef);

  // Uploaded files.
  try {
    const bucket = adminStorage().bucket();
    await bucket.deleteFiles({ prefix: `users/${uid}/` });
    await bucket.deleteFiles({ prefix: `posts/${uid}/` });
  } catch (error) {
    console.error('Storage cleanup failed for deleted account', { uid, error });
  }

  await adminAuth().deleteUser(uid);
}
