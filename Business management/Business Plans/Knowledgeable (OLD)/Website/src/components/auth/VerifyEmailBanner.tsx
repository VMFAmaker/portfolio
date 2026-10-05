"use client";

import { useState } from 'react';
import { useI18n } from '@/contexts/LanguageContext';
import { MailWarning } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { friendlyAuthError } from '@/lib/auth/errors';

/** Unverified email/password accounts can read, but must verify before posting or messaging. */
export function VerifyEmailBanner() {
  const { user, resendVerificationEmail, refreshVerification } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [busy, setBusy] = useState<'resend' | 'check' | null>(null);

  if (!user || user.emailVerified) return null;

  const handleResend = async () => {
    setBusy('resend');
    try {
      await resendVerificationEmail();
      toast({ title: t('Verification email sent'), description: t('Check the inbox for {email}.', { email: user.email ?? '' }) });
    } catch (error) {
      toast({ title: t('Could not send email'), description: t(friendlyAuthError(error)), variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const handleCheck = async () => {
    setBusy('check');
    try {
      const verified = await refreshVerification();
      toast(
        verified
          ? { title: t('Email verified'), description: t('You can now post, comment and message.') }
          : { title: t('Not verified yet'), description: t('Open the link in the email we sent you, then try again.') }
      );
    } catch (error) {
      toast({ title: t('Could not check verification'), description: t(friendlyAuthError(error)), variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Alert className="mb-6 max-w-2xl mx-auto w-full">
      <MailWarning className="h-4 w-4" />
      <AlertTitle>{t('Verify your email to start posting')}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{t('We sent a link to {email}. You can browse and read in the meantime.', { email: user.email ?? '' })}</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={handleCheck} disabled={busy !== null}>
            {busy === 'check' ? t('Checking…') : t("I've verified")}
          </Button>
          <Button size="sm" variant="outline" onClick={handleResend} disabled={busy !== null}>
            {busy === 'resend' ? t('Sending…') : t('Resend email')}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
