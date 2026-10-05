import type { AppNotification } from '@/lib/types';

type Translate = (text: string, vars?: Record<string, string | number>) => string;
type NotificationLink = Pick<AppNotification, 'type' | 'postId' | 'actorId' | 'conversationId' | 'bookId'>;
type NotificationContent = Pick<AppNotification, 'type' | 'actorName' | 'postTitle' | 'dueCount' | 'bookTitle'>;

/**
 * One sentence describing a notification. Shared by the notifications page (client) and push /
 * email delivery (server) so both say the same thing in the reader's language.
 */
export function describeNotification(n: NotificationContent, t: Translate): string {
  const name = n.actorName ?? t('Someone');
  switch (n.type) {
    case 'like':
      return t('{name} liked your post “{title}”', { name, title: n.postTitle ?? '' });
    case 'comment':
      return t('{name} commented on “{title}”', { name, title: n.postTitle ?? '' });
    case 'follow':
      return t('{name} started following you', { name });
    case 'message':
      return t('{name} sent you a message', { name });
    case 'file':
      return t('{name} shared a file with you', { name });
    case 'morning':
      if (n.dueCount && n.bookTitle) {
        return t('Good morning! {count} ideas to revisit, and “{title}” is waiting for you.', { count: n.dueCount, title: n.bookTitle });
      }
      if (n.bookTitle) return t('Good morning! Pick up “{title}” where you left off.', { title: n.bookTitle });
      if (n.dueCount) return t('Good morning! {count} ideas are ready to revisit.', { count: n.dueCount });
      return t('Good morning! Something new to learn is waiting in your feed.');
  }
}

/** Where tapping a notification takes you. */
export function notificationHref(n: NotificationLink): string {
  switch (n.type) {
    case 'like':
    case 'comment':
      return n.postId ? `/content/${n.postId}` : '/notifications';
    case 'follow':
      return n.actorId ? `/profile/${n.actorId}` : '/notifications';
    case 'message':
    case 'file':
      return n.conversationId ? `/chat/${n.conversationId}` : '/chat';
    case 'morning':
      return n.bookId ? `/read/${n.bookId}` : '/';
  }
}
