"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { GoogleButton, OrDivider } from '@/components/auth/GoogleButton';
import { passwordSchema } from '@/lib/auth/password';

const signupSchema = z.object({
  name: z.string().trim().min(1, { message: msg("Name is required.") }).max(60, { message: msg("Name is too long.") }),
  email: z.string().trim().email({ message: msg("Invalid email address.") }),
  password: passwordSchema,
  confirmPassword: z.string().min(1, { message: msg("Please confirm your password.") }),
}).refine(data => data.password === data.confirmPassword, {
  message: msg("Passwords don't match."),
  path: ["confirmPassword"],
});

type SignupFormInputs = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const { signUp, signInWithGoogle } = useAuth();
  const { t } = useI18n();
  const [formError, setFormError] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignupFormInputs>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit: SubmitHandler<SignupFormInputs> = async (data) => {
    setFormError(null);
    try {
      await signUp(data.name, data.email, data.password);
      router.replace('/welcome');
    } catch (error) {
      setFormError(t(friendlyAuthError(error)));
    }
  };

  const onGoogle = async () => {
    setFormError(null);
    setGoogleBusy(true);
    try {
      await signInWithGoogle();
      router.replace('/welcome');
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
        <CardTitle className="text-3xl font-bold">{t('Create an account')}</CardTitle>
        <CardDescription className="text-muted-foreground">
          {t('Join Knowledgeable to start your learning journey.')}
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent className="space-y-6">
          {formError && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <GoogleButton onClick={onGoogle} disabled={busy} label={t('Sign up with Google')} />
          <OrDivider />
          <div className="space-y-2">
            <Label htmlFor="name">{t('Name')}</Label>
            <Input
              id="name"
              type="text"
              autoComplete="name"
              placeholder={t('Your name')}
              {...register("name")}
              aria-invalid={errors.name ? "true" : "false"}
            />
            {errors.name && <p className="text-sm text-destructive">{t(errors.name.message ?? '')}</p>}
          </div>
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
              autoComplete="new-password"
              placeholder="••••••••"
              {...register("password")}
              aria-invalid={errors.password ? "true" : "false"}
              aria-describedby="password-hint"
            />
            {errors.password
              ? <p className="text-sm text-destructive">{t(errors.password.message ?? '')}</p>
              : <p id="password-hint" className="text-xs text-muted-foreground">{t('At least 8 characters, with a letter and a number.')}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t('Confirm password')}</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              {...register("confirmPassword")}
              aria-invalid={errors.confirmPassword ? "true" : "false"}
            />
            {errors.confirmPassword && <p className="text-sm text-destructive">{t(errors.confirmPassword.message ?? '')}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={busy}>
            {isSubmitting ? t('Creating account…') : t('Sign up')}
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            {t('Already have an account?')}{' '}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              {t('Log in')}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
