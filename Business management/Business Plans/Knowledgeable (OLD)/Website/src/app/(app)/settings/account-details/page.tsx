"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { ArrowLeft, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useCurrentUser } from '@/contexts/AuthContext';
import { getPrivateAccount, savePrivateAccount, updateProfileFields, uploadAvatar } from '@/lib/data/profiles';
import { friendlyAuthError } from '@/lib/auth/errors';
import { passwordSchema } from '@/lib/auth/password';
import { getFirebaseAuth } from '@/lib/firebase/client';
import { useI18n } from '@/contexts/LanguageContext';
import { msg } from '@/lib/i18n/core';

const currentYear = new Date().getFullYear();

const accountDetailsSchema = z.object({
  displayName: z.string().trim().min(1, msg('Name is required.')).max(60, msg('Name is too long.')),
  bio: z.string().max(280, msg('Keep your bio under 280 characters.')),
  nationality: z.string().max(80),
  country: z.string().max(80),
  spokenLanguages: z.string().max(200),
  birthYear: z.union([z.literal(''), z.coerce.number().int().min(1900).max(currentYear)]),
});

type AccountDetailsFormInputs = z.infer<typeof accountDetailsSchema>;

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, msg('Enter your current password.')),
  newPassword: passwordSchema,
});
type PasswordInputs = z.infer<typeof passwordFormSchema>;

function ChangePasswordCard() {
  const { toast } = useToast();
  const { t } = useI18n();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PasswordInputs>({
    resolver: zodResolver(passwordFormSchema),
  });

  const onSubmit: SubmitHandler<PasswordInputs> = async ({ currentPassword, newPassword }) => {
    const current = getFirebaseAuth().currentUser;
    if (!current?.email) return;
    try {
      await reauthenticateWithCredential(current, EmailAuthProvider.credential(current.email, currentPassword));
      await updatePassword(current, newPassword);
      reset();
      toast({ title: t('Password changed'), description: t('Use your new password next time you log in.') });
    } catch (error) {
      toast({ title: t('Password not changed'), description: t(friendlyAuthError(error)), variant: 'destructive' });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="currentPassword">{t('Current password')}</Label>
          <Input id="currentPassword" type="password" autoComplete="current-password" {...register('currentPassword')} />
          {errors.currentPassword && <p className="text-sm text-destructive">{t(errors.currentPassword.message ?? '')}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="newPassword">{t('New password')}</Label>
          <Input id="newPassword" type="password" autoComplete="new-password" {...register('newPassword')} />
          {errors.newPassword && <p className="text-sm text-destructive">{t(errors.newPassword.message ?? '')}</p>}
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" variant="outline" disabled={isSubmitting}>
          {isSubmitting ? t('Updating…') : t('Change password')}
        </Button>
      </div>
    </form>
  );
}

export default function AccountDetailsPage() {
  const { toast } = useToast();
  const { user, profile } = useCurrentUser();
  const { signOut } = useAuth();
  const { t } = useI18n();
  const usesPassword = user.providerData.some((p) => p.providerId === 'password');
  const [loaded, setLoaded] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [readingPublic, setReadingPublic] = useState(profile.readingPublic);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<AccountDetailsFormInputs>({
    resolver: zodResolver(accountDetailsSchema),
    defaultValues: { displayName: profile.displayName, bio: profile.bio ?? '', nationality: '', country: '', spokenLanguages: '', birthYear: '' },
  });

  useEffect(() => {
    getPrivateAccount(user.uid)
      .then((account) => {
        reset({
          displayName: profile.displayName,
          bio: profile.bio ?? '',
          nationality: account.nationality ?? '',
          country: account.country ?? '',
          spokenLanguages: account.spokenLanguages ?? '',
          birthYear: account.birthYear ?? '',
        });
      })
      .finally(() => setLoaded(true));
    // Load once; later profile snapshots shouldn't overwrite what the user is typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.uid]);

  const onSubmit: SubmitHandler<AccountDetailsFormInputs> = async (data) => {
    try {
      await Promise.all([
        updateProfileFields(user.uid, { displayName: data.displayName.trim(), bio: data.bio.trim() }),
        savePrivateAccount(user.uid, {
          nationality: data.nationality.trim(),
          country: data.country.trim(),
          spokenLanguages: data.spokenLanguages.trim(),
          birthYear: data.birthYear === '' ? undefined : data.birthYear,
        }),
      ]);
      toast({ title: t('Saved'), description: t('Your account details have been updated.') });
    } catch {
      toast({ title: t('Could not save'), description: t('Please check the fields and try again.'), variant: 'destructive' });
    }
  };

  const onAvatar = async (file: File | undefined) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      toast({ title: t('Image not accepted'), description: t('Use a PNG, JPEG, WebP or GIF under 5 MB.'), variant: 'destructive' });
      return;
    }
    setAvatarBusy(true);
    try {
      const url = await uploadAvatar(user.uid, file);
      await updateProfileFields(user.uid, { avatarUrl: url });
      toast({ title: t('Profile picture updated') });
    } catch {
      toast({ title: t('Upload failed'), variant: 'destructive' });
    } finally {
      setAvatarBusy(false);
    }
  };

  const onReadingPublic = async (value: boolean) => {
    setReadingPublic(value);
    try {
      await updateProfileFields(user.uid, { readingPublic: value });
    } catch {
      setReadingPublic(!value);
      toast({ title: t('Could not update privacy setting'), variant: 'destructive' });
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full py-8 space-y-6">
      <Button variant="outline" asChild>
        <Link href="/settings">
          <ArrowLeft className="mr-2 h-4 w-4" /> {t('Back to settings')}
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{t('Account details')}</CardTitle>
          <CardDescription>{t('Your name, picture and bio are public. Everything under “Private details” is visible only to you.')}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile.avatarUrl} alt={profile.displayName} />
                <AvatarFallback>{profile.displayName.substring(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <Label htmlFor="avatar" className="cursor-pointer text-sm font-medium text-primary hover:underline">
                  {avatarBusy ? t('Uploading…') : t('Change picture')}
                </Label>
                <input id="avatar" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" disabled={avatarBusy}
                  onChange={(e) => onAvatar(e.target.files?.[0])} />
                <p className="text-xs text-muted-foreground">{t('PNG, JPEG, WebP or GIF, up to 5 MB.')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">{t('Name')}</Label>
                <Input id="displayName" {...register("displayName")} />
                {errors.displayName && <p className="text-sm text-destructive">{t(errors.displayName.message ?? '')}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="handle">{t('Handle')}</Label>
                <Input id="handle" value={`@${profile.handle}`} disabled className="cursor-not-allowed bg-muted/50" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('Email address')}</Label>
              <Input id="email" value={user.email ?? ''} disabled className="cursor-not-allowed bg-muted/50" />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {user.emailVerified ? <><ShieldCheck className="h-3.5 w-3.5" /> {t('Verified')}</> : t('Not verified yet')}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">{t('Bio')}</Label>
              <Textarea id="bio" rows={3} maxLength={280} {...register("bio")} placeholder={t('What are you learning about?')} />
              {errors.bio && <p className="text-sm text-destructive">{t(errors.bio.message ?? '')}</p>}
            </div>

            <Separator />
            <h3 className="font-semibold flex items-center gap-2"><Lock className="h-4 w-4" /> {t('Private details')}</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nationality">{t('Nationality')}</Label>
                <Input id="nationality" {...register("nationality")} disabled={!loaded} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">{t('Country of residence')}</Label>
                <Input id="country" {...register("country")} disabled={!loaded} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="spokenLanguages">{t('Spoken languages')}</Label>
                <Input id="spokenLanguages" {...register("spokenLanguages")} placeholder={t('e.g. English, Spanish')} disabled={!loaded} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthYear">{t('Year of birth')}</Label>
                <Input id="birthYear" type="number" inputMode="numeric" {...register("birthYear")} disabled={!loaded} />
                {errors.birthYear && <p className="text-sm text-destructive">{t('Enter a year between 1900 and {year}.', { year: currentYear })}</p>}
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting || !loaded}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t('Save changes')}
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t('Privacy')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="readingPublic" className="font-medium">{t('Show my reading lists on my profile')}</Label>
              <p className="text-xs text-muted-foreground">{t("When off, only you can see what you're reading and have read.")}</p>
            </div>
            <Switch id="readingPublic" checked={readingPublic} onCheckedChange={onReadingPublic} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t('Security')}</CardTitle>
          <CardDescription>
            {usesPassword ? t('Change your password or sign out of every device.') : t('You sign in with Google. Manage your password in your Google account.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {usesPassword && <ChangePasswordCard />}
          <Separator />
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">{t('Lost a device or used a shared computer? End every session, including this one.')}</p>
            <Button variant="outline" onClick={() => void signOut({ everywhere: true })}>{t('Sign out everywhere')}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
