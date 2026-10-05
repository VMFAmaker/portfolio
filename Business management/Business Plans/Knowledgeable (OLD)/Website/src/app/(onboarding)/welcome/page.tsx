"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InterestPicker } from '@/components/pfs/InterestPicker';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/LanguageContext';
import { createProfile, HANDLE_PATTERN, isHandleAvailable, suggestHandle } from '@/lib/data/profiles';
import { MIN_INTERESTS } from '@/lib/taxonomy';

type HandleState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

/**
 * Onboarding. Step 1 is the Personalised Feed Setup — the first thing a new member sees;
 * afterwards it lives in Settings → Personalise feed. Step 2 is the public profile.
 */
export default function WelcomePage() {
  const router = useRouter();
  const { user, status, profile, signOut } = useAuth();
  const { t } = useI18n();
  const [step, setStep] = useState<1 | 2>(1);
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [handleState, setHandleState] = useState<HandleState>('idle');
  const [interests, setInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') void signOut();
  }, [status, signOut]);

  useEffect(() => {
    if (profile) router.replace('/');
  }, [profile, router]);

  useEffect(() => {
    if (user && !displayName) {
      const name = user.displayName ?? '';
      setDisplayName(name);
      setHandle(suggestHandle(name || user.email?.split('@')[0] || 'reader'));
    }
    // Only prefill once, when the user first loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Debounced availability check.
  useEffect(() => {
    if (!handle) return setHandleState('idle');
    if (!HANDLE_PATTERN.test(handle)) return setHandleState('invalid');
    setHandleState('checking');
    const timer = setTimeout(() => {
      isHandleAvailable(handle)
        .then((ok) => setHandleState(ok ? 'available' : 'taken'))
        .catch(() => setHandleState('idle'));
    }, 350);
    return () => clearTimeout(timer);
  }, [handle]);

  if (!user) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const canFinish = displayName.trim().length > 0 && displayName.trim().length <= 60 && handleState === 'available';

  const finish = async () => {
    setSaving(true);
    setError(null);
    try {
      await createProfile({
        uid: user.uid,
        displayName: displayName.trim(),
        handle,
        interests,
        avatarUrl: user.photoURL?.startsWith('https://lh3.googleusercontent.com/') ? user.photoURL : null,
      });
      router.replace('/');
      router.refresh();
    } catch {
      setError(t('We could not save your profile. That handle may have just been taken — try another.'));
      setHandleState('taken');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pt-4">
      <div>
        <p className="text-sm text-muted-foreground">{t('Step {step} of 2', { step })}</p>
        <h1 className="text-3xl font-bold">{step === 1 ? t('What do you want to learn?') : t('Your profile')}</h1>
        {step === 1 && <p className="mt-1 text-muted-foreground">{t('Pick the subjects for your feed. You can change them any time in Settings.')}</p>}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {step === 1 ? (
        <div className="space-y-6">
          <InterestPicker value={interests} onChange={setInterests} />
          <div className="flex items-center justify-between border-t pt-4">
            <Button variant="ghost" onClick={() => void signOut()}>{t('Sign out')}</Button>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{t('{count} selected', { count: interests.length })}</span>
              <Button onClick={() => setStep(2)} disabled={interests.length < MIN_INTERESTS}>{t('Continue')}</Button>
            </div>
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{t('How other readers will see you')}</CardTitle>
            <CardDescription>{t("Your handle can't be changed later.")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="displayName">{t('Name')}</Label>
              <Input id="displayName" value={displayName} maxLength={60} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="handle">{t('Handle')}</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                <Input
                  id="handle"
                  className="pl-7 pr-9"
                  value={handle}
                  maxLength={20}
                  autoComplete="off"
                  onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  aria-describedby="handle-status"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  {handleState === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  {handleState === 'available' && <Check className="h-4 w-4 text-green-600" />}
                  {(handleState === 'taken' || handleState === 'invalid') && <X className="h-4 w-4 text-destructive" />}
                </span>
              </div>
              <p id="handle-status" className="text-xs text-muted-foreground">
                {handleState === 'taken' && t('That handle is taken.')}
                {handleState === 'available' && t('Available!')}
                {(handleState === 'idle' || handleState === 'checking' || handleState === 'invalid') &&
                  t('3–20 characters: lowercase letters, numbers and underscores.')}
              </p>
            </div>
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>{t('Back')}</Button>
            <Button onClick={finish} disabled={!canFinish || saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('Start learning')}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
