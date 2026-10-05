"use client";

import { useState } from 'react';
import Link from 'next/link';
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

const schema = z.object({
  email: z.string().trim().email({ message: msg("Invalid email address.") }),
});

type Inputs = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth();
  const { t } = useI18n();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Inputs>({
    resolver: zodResolver(schema),
  });

  const onSubmit: SubmitHandler<Inputs> = async ({ email }) => {
    setFormError(null);
    try {
      await sendPasswordReset(email);
      setSentTo(email);
    } catch (error) {
      setFormError(t(friendlyAuthError(error)));
    }
  };

  return (
    <Card className="w-full shadow-2xl">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-bold">{t('Reset your password')}</CardTitle>
        <CardDescription className="text-muted-foreground">
          {t("We'll email you a secure link to choose a new one.")}
        </CardDescription>
      </CardHeader>
      {sentTo ? (
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              {t('If an account exists for {email}, a reset link is on its way. The link expires after one hour.', { email: sentTo })}
            </AlertDescription>
          </Alert>
          <Button asChild className="w-full">
            <Link href="/login">{t('Back to log in')}</Link>
          </Button>
        </CardContent>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <CardContent className="space-y-6">
            {formError && (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{t('Email')}</Label>
              <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" {...register("email")} />
              {errors.email && <p className="text-sm text-destructive">{t(errors.email.message ?? '')}</p>}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? t('Sending…') : t('Send reset link')}
            </Button>
            <Link href="/login" className="text-sm text-primary hover:underline">{t('Back to log in')}</Link>
          </CardFooter>
        </form>
      )}
    </Card>
  );
}
