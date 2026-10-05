"use client";

import { useState } from 'react';
import { EmailAuthProvider, GoogleAuthProvider, reauthenticateWithCredential, reauthenticateWithPopup } from 'firebase/auth';
import { Loader2, Trash2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCurrentUser } from '@/contexts/AuthContext';
import { friendlyAuthError } from '@/lib/auth/errors';
import { getFirebaseAuth } from '@/lib/firebase/client';
import { useI18n } from '@/contexts/LanguageContext';

/**
 * Permanently deletes the account. The user must re-authenticate first, and the server
 * independently checks that the sign-in is fresh before erasing anything.
 */
export function DeleteAccountDialog() {
  const { user } = useCurrentUser();
  const { t } = useI18n();
  const usesPassword = user.providerData.some((p) => p.providerId === 'password');
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteAccount = async () => {
    setBusy(true);
    setError(null);
    try {
      const current = getFirebaseAuth().currentUser;
      if (!current) throw new Error('Not signed in');
      if (usesPassword) {
        await reauthenticateWithCredential(current, EmailAuthProvider.credential(current.email ?? '', password));
      } else {
        await reauthenticateWithPopup(current, new GoogleAuthProvider());
      }
      const idToken = await current.getIdToken(true);
      const res = await fetch('/api/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) throw new Error('delete_failed');
      await getFirebaseAuth().signOut().catch(() => undefined);
      window.location.assign('/login');
    } catch (e) {
      setError(e instanceof Error && e.message === 'delete_failed'
        ? t('We could not delete your account. Please try again.')
        : t(friendlyAuthError(e)));
      setBusy(false);
    }
  };

  const canDelete = confirmText === 'DELETE' && (!usesPassword || password.length > 0) && !busy;

  return (
    <AlertDialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setPassword(''); setConfirmText(''); setError(null); } }}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="mr-2 h-4 w-4" /> {t('Delete account')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('Delete your account?')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('This permanently deletes your profile, posts, comments, reading history, saved items, messages and uploaded files. It cannot be undone.')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4">
          {usesPassword && (
            <div className="space-y-2">
              <Label htmlFor="delete-password">{t('Confirm your password')}</Label>
              <Input id="delete-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="delete-confirm">{t('Type DELETE to confirm')}</Label>
            <Input id="delete-confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{t('Cancel')}</AlertDialogCancel>
          <Button variant="destructive" onClick={deleteAccount} disabled={!canDelete}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('Delete forever')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
