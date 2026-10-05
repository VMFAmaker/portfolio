import { NextResponse, type NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { isSameOriginRequest, readJsonBody } from '@/lib/auth/request';
import { rateLimit } from '@/lib/server/rate-limit';
import { adminDb } from '@/lib/firebase/admin';
import { deliver } from '@/lib/server/notify';

export const dynamic = 'force-dynamic';

const ID = /^[A-Za-z0-9_-]{1,128}$/;
const RECENT_MS = 5 * 60 * 1000;

function isId(value: unknown): value is string {
  return typeof value === 'string' && ID.test(value);
}

function isRecent(createdAt: FirebaseFirestore.Timestamp | undefined): boolean {
  return Boolean(createdAt) && Date.now() - createdAt!.toMillis() < RECENT_MS;
}

/**
 * Called by the app right after a like, comment, follow or message. Nothing in the request is
 * trusted: the server looks up the like/comment/follow/message itself, checks the signed-in user
 * really did it, and only then notifies the other person.
 */
export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await readJsonBody(req);
  if (!body) return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  if (!rateLimit(`notify:${user.uid}`, 60, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const db = adminDb();
  const actor = user.uid;
  try {
    switch (body.type) {
      case 'like': {
        if (!isId(body.postId)) break;
        const [post, like] = await Promise.all([
          db.doc(`posts/${body.postId}`).get(),
          db.doc(`posts/${body.postId}/likes/${actor}`).get(),
        ]);
        if (!post.exists || !like.exists) return NextResponse.json({ ok: false });
        await deliver(post.get('authorId'), { type: 'like', actorId: actor, postId: post.id, postTitle: post.get('title') },
          `like_${post.id}_${actor}`);
        return NextResponse.json({ ok: true });
      }
      case 'comment': {
        if (!isId(body.postId) || !isId(body.commentId)) break;
        const [post, comment] = await Promise.all([
          db.doc(`posts/${body.postId}`).get(),
          db.doc(`posts/${body.postId}/comments/${body.commentId}`).get(),
        ]);
        if (!post.exists || !comment.exists || comment.get('authorId') !== actor) return NextResponse.json({ ok: false });
        await deliver(post.get('authorId'), {
          type: 'comment', actorId: actor, postId: post.id, postTitle: post.get('title'),
          snippet: String(comment.get('text') ?? '').slice(0, 140),
        }, `comment_${comment.id}`);
        return NextResponse.json({ ok: true });
      }
      case 'follow': {
        if (!isId(body.targetUid)) break;
        const edge = await db.doc(`users/${body.targetUid}/followers/${actor}`).get();
        if (!edge.exists) return NextResponse.json({ ok: false });
        await deliver(body.targetUid, { type: 'follow', actorId: actor }, `follow_${actor}`);
        return NextResponse.json({ ok: true });
      }
      case 'message': {
        if (!isId(body.conversationId) || !isId(body.messageId)) break;
        const [convo, message] = await Promise.all([
          db.doc(`conversations/${body.conversationId}`).get(),
          db.doc(`conversations/${body.conversationId}/messages/${body.messageId}`).get(),
        ]);
        const participants: string[] = convo.get('participantIds') ?? [];
        if (!convo.exists || !message.exists || !participants.includes(actor) || message.get('senderId') !== actor
          || !isRecent(message.get('createdAt'))) {
          return NextResponse.json({ ok: false });
        }
        const recipient = participants.find((id) => id !== actor);
        if (!recipient) return NextResponse.json({ ok: false });
        const attachment = message.get('attachment') as { name?: string } | undefined;
        if (attachment) {
          await deliver(recipient, { type: 'file', actorId: actor, conversationId: convo.id, snippet: attachment.name },
            `file_${message.id}`);
        } else {
          // One entry per conversation, updated with the latest message, so a chat doesn't flood the list.
          await deliver(recipient, {
            type: 'message', actorId: actor, conversationId: convo.id, snippet: String(message.get('text') ?? '').slice(0, 140),
          }, `message_${convo.id}`);
        }
        return NextResponse.json({ ok: true });
      }
    }
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  } catch (error) {
    console.error('[notify] failed', { type: body.type, error });
    return NextResponse.json({ error: 'notify_failed' }, { status: 500 });
  }
}
