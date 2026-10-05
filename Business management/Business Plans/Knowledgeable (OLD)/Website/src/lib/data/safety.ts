"use client";

import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, writeBatch, type DocumentData } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
import { getDb, getFirebaseStorage } from '@/lib/firebase/client';
import { msg } from '@/lib/i18n/core';
import type { ReportReason, ReportTargetType } from '@/lib/types';

export const REPORT_REASONS: Array<{ value: ReportReason; label: string; hint: string }> = [
  { value: 'spam', label: msg('Spam or scam'), hint: msg('Repeated, misleading or commercial content, or attempts to trick people.') },
  { value: 'harassment', label: msg('Harassment or bullying'), hint: msg('Insults, threats or targeting someone.') },
  { value: 'hate', label: msg('Hate speech or discrimination'), hint: msg('Attacks on people for who they are.') },
  { value: 'misinformation', label: msg('False or misleading information'), hint: msg('Claims presented as fact that are wrong or made up.') },
  { value: 'copyright', label: msg('Plagiarism or copyright infringement'), hint: msg('Someone else’s work copied without credit or permission.') },
  { value: 'sexual', label: msg('Sexual or inappropriate content'), hint: msg('Content that isn’t suitable for a learning community.') },
  { value: 'violence', label: msg('Violence or threats'), hint: msg('Encouraging or threatening harm.') },
  { value: 'impersonation', label: msg('Impersonation'), hint: msg('Pretending to be another person or organisation.') },
  { value: 'self-harm', label: msg('Self-harm or someone at risk'), hint: msg('If someone is in immediate danger, contact local emergency services.') },
  { value: 'other', label: msg('Something else'), hint: msg('Tell us what happened in the details.') },
];

export const REPORT_DETAILS_MAX = 2000;
export const REPORT_EVIDENCE_MAX = 4000;
export const REPORT_MAX_FILES = 3;
export const REPORT_FILE_MAX_MB = 5;
export const REPORT_FILE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf'];

// ---------- blocking ----------

export function subscribeBlocked(uid: string, onChange: (ids: Set<string>) => void) {
  return onSnapshot(
    collection(getDb(), 'users', uid, 'blocked'),
    (snap) => onChange(new Set(snap.docs.map((d) => d.id))),
    () => onChange(new Set())
  );
}

/**
 * Blocks someone: they can no longer message you, comment on your posts or follow you (enforced
 * by the security rules), and their content is hidden from you. Any follow in either direction
 * is removed at the same time.
 */
export async function blockUser(me: string, target: string): Promise<void> {
  const db = getDb();
  const batch = writeBatch(db);
  batch.set(doc(db, 'users', me, 'blocked', target), { uid: target, createdAt: serverTimestamp() });
  batch.delete(doc(db, 'users', me, 'following', target));
  batch.delete(doc(db, 'users', target, 'followers', me));
  batch.delete(doc(db, 'users', target, 'following', me));
  batch.delete(doc(db, 'users', me, 'followers', target));
  await batch.commit();
}

export async function unblockUser(me: string, target: string): Promise<void> {
  await deleteDoc(doc(getDb(), 'users', me, 'blocked', target));
}

// ---------- reporting ----------

export interface ReportInput {
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  targetUserId: string;
  /** Where it happened, e.g. a post id or conversation id, to help reviewers find it. */
  context?: string;
  reason: ReportReason;
  details: string;
  evidence: string;
  files: File[];
}

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-80) || 'file';
}

/**
 * Files a report for the moderation team. Evidence files go to a private folder that only
 * admins can read; the report itself can be created by the reporter but read only by admins.
 */
export async function submitReport(input: ReportInput): Promise<void> {
  const db = getDb();
  const reportRef = doc(collection(db, 'reports'));
  const evidenceFiles: Array<{ path: string; name: string; contentType: string; size: number }> = [];
  for (const [i, file] of input.files.slice(0, REPORT_MAX_FILES).entries()) {
    const path = `reports/${input.reporterId}/${reportRef.id}/${i}-${safeFileName(file.name)}`;
    await uploadBytes(ref(getFirebaseStorage(), path), file, { contentType: file.type });
    evidenceFiles.push({ path, name: file.name.slice(0, 200), contentType: file.type, size: file.size });
  }
  const data: DocumentData = {
    reporterId: input.reporterId,
    targetType: input.targetType,
    targetId: input.targetId,
    targetUserId: input.targetUserId,
    reason: input.reason,
    details: input.details.trim().slice(0, REPORT_DETAILS_MAX),
    evidence: input.evidence.trim().slice(0, REPORT_EVIDENCE_MAX),
    evidenceFiles,
    status: 'open',
    createdAt: serverTimestamp(),
  };
  if (input.context) data.context = input.context.slice(0, 200);
  await setDoc(reportRef, data);
}
