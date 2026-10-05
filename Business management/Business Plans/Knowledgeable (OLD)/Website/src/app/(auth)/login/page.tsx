"use client";

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/LanguageContext';
import { msg } from '@/lib/i18n/core';
import { friendlyAuthError } from '@/lib/auth/errors';
import { safeNextPath } from '@/lib/auth/constants';
import { GoogleButton, OrDivider } from '@/components/auth/GoogleButton';

const loginSchema = z.object({
  email: z.string().trim().email({ message: msg("Invalid email address.") }),
  password: z.string().min(1, { message: msg("Password is required.") }),
});

type LoginFormInputs = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get('next'));
  const sessionExpired = searchParams.get('reason') === 'session';
  const { signIn, signInWithGoogle } = useAuth();
  const { t } = useI18n();
  const [formError, setFormError] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
  });

  const goToApp = () => {
    router.replace(next);
    router.refresh();
  };

  const onSubmit: SubmitHandler<LoginFormInputs> = async (data) => {
    setFormError(null);
    try {
      await signIn(data.email, data.password);
      goToApp();
    } catch (error) {
      setFormError(t(friendlyAuthError(error)));
    }
  };

  const onGoogle = async () => {
    setFormError(null);
    setGoogleBusy(true);
    try {
      await signInWithGoogle();
      goToApp();
    } catch (error) {
      setFormError(t(friendlyAuthError(error)));
    } finally {
      setGoogleBusy(false);
    }
  };

  const busy = isSubmitting || googleBusy;

  return (
    <Card className="w-full shadow-2xl">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-bold">{t('Welcome back!')}</CardTitle>
        <CardDescription className="text-muted-foreground">
          {t('Log in to continue to Knowledgeable.')}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent className="space-y-6">
          {sessionExpired && !formError && (
            <Alert>
              <AlertDescription>{t('Your session ended. Please log in again.')}</AlertDescription>
            </Alert>
          )}
          {formError && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <GoogleButton onClick={onGoogle} disabled={busy} label={t('Continue with Google')} />
          <OrDivider />
          <div className="space-y-2">
            <Label htmlFor="email">{t('Email')}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              {...register("email")}
              aria-invalid={errors.email ? "true" : "false"}
            />
            {errors.email && <p className="text-sm text-destructive">{t(errors.email.message ?? '')}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t('Password')}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              {...register("password")}
              aria-invalid={errors.password ? "true" : "false"}
            />
            {errors.password && <p className="text-sm text-destructive">{t(errors.password.message ?? '')}</p>}
          </div>
          <div className="flex items-center justify-end">
            <Link href="/forgot-password" className="text-sm text-primary hover:underline">
              {t('Forgot password?')}
            </Link>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={busy}>
            {isSubmitting ? t('Logging in…') : t('Log in')}
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            {t("Don't have an account?")}{' '}
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              {t('Sign up')}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
