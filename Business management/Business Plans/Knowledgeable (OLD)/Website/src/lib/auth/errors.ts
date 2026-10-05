import { msg } from '@/lib/i18n/core';

/**
 * Maps Firebase Auth error codes to messages that are helpful without leaking whether an
 * account exists (login and reset flows deliberately share one generic message).
 * Returns British English; translate with t() where it is shown.
 */
export function friendlyAuthError(error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: unknown }).code) : '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return msg('Incorrect email or password.');
    case 'auth/email-already-in-use':
      return msg('An account with this email already exists. Try logging in instead.');
    case 'auth/weak-password':
    case 'auth/password-does-not-meet-requirements':
      return msg('That password is too weak. Use at least 8 characters with letters and numbers.');
    case 'auth/too-many-requests':
      return msg('Too many attempts. Please wait a few minutes and try again.');
    case 'auth/user-disabled':
      return msg('This account has been disabled. Contact support if you think this is a mistake.');
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return msg('Sign-in was cancelled.');
    case 'auth/popup-blocked':
      return msg('Your browser blocked the sign-in pop-up. Allow pop-ups for this site and try again.');
    case 'auth/network-request-failed':
      return msg('Network error. Check your connection and try again.');
    case 'auth/requires-recent-login':
      return msg('For your security, please confirm your password and try again.');
    default:
      if (error instanceof Error && error.message.startsWith('session:')) {
        return msg('Could not start a secure session. Please try signing in again.');
      }
      return msg('Something went wrong. Please try again.');
  }
}
