import 'server-only';

import { initializeApp, getApps, cert, applicationDefault, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage, type Storage } from 'firebase-admin/storage';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';

let adminApp: App | undefined;

/**
 * Credentials, in order of preference:
 * 1. FIREBASE_SERVICE_ACCOUNT_KEY — the service-account JSON (local dev against a real project).
 * 2. Application Default Credentials — automatic on Firebase App Hosting / Cloud Run.
 * With FIREBASE_AUTH_EMULATOR_HOST / FIRESTORE_EMULATOR_HOST set, the SDK talks to the
 * emulators and no credentials are needed.
 */
function getAdminApp(): App {
  if (adminApp) return adminApp;
  const existing = getApps()[0];
  if (existing) {
    adminApp = existing;
    return adminApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET ?? process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const usingEmulators = Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST);
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (usingEmulators) {
    adminApp = initializeApp({ projectId, storageBucket });
  } else if (serviceAccountJson) {
    adminApp = initializeApp({ credential: cert(JSON.parse(serviceAccountJson)), projectId, storageBucket });
  } else {
    adminApp = initializeApp({ credential: applicationDefault(), projectId, storageBucket });
  }
  return adminApp;
}

export function adminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function adminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export function adminStorage(): Storage {
  return getStorage(getAdminApp());
}

export function adminMessaging(): Messaging {
  return getMessaging(getAdminApp());
}

/** True when the server is talking to the local emulators (no real push or email). */
export function usingEmulators(): boolean {
  return Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST);
}
