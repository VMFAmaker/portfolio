"use client";

import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/LanguageContext';
import { DeleteAccountDialog } from '@/components/settings/DeleteAccountDialog';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { msg } from '@/lib/i18n/core';
import { LanguageSelect } from '@/components/LanguageSelect';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Moon, Sun, Type, User, LogOut, ChevronRight, Activity, Languages, BadgeDollarSign, HelpCircle, Sparkles, Bell } from 'lucide-react';

const FONT_SIZES = [
  { value: 'small', label: msg('Small') },
  { value: 'medium', label: msg('Medium') },
  { value: 'large', label: msg('Large') },
] as const;

function SettingsLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
      <p className="font-medium">{children}</p>
      <ChevronRight className="w-5 h-5 text-muted-foreground" />
    </Link>
  );
}

export default function SettingsPage() {
  const { theme, toggleTheme, fontSize, setFontSize } = useTheme();
  const { profile, signOut } = useAuth();
  const { t, topic } = useI18n();
  const profileHref = profile ? `/profile/${profile.id}` : '/';

  return (
    <div className="max-w-2xl mx-auto w-full space-y-8 py-8">
      <h1 className="text-4xl font-bold text-left">{t('Settings')}</h1>

      <Accordion type="multiple" className="w-full space-y-1">

        <AccordionItem value="appearance">
          <AccordionTrigger className="text-xl font-semibold hover:no-underline">
            <div className="flex items-center gap-2">
              <Sun className="w-5 h-5" />/<Moon className="w-5 h-5" />
              <span>{t('Appearance')}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 space-y-4">
            <p className="text-muted-foreground px-4">{t('Customise the look and feel of the app.')}</p>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label htmlFor="theme-toggle" className="font-medium">{t('Theme')}</Label>
              <Button onClick={toggleTheme} variant="outline" size="sm" id="theme-toggle">
                {theme === 'light' ? t('Switch to dark mode') : t('Switch to light mode')}
              </Button>
            </div>
            <div className="p-3 border rounded-lg">
              <Label className="font-medium flex items-center gap-2 mb-2"><Type className="h-5 w-5" /> {t('Text size')}</Label>
              <RadioGroup
                value={fontSize}
                onValueChange={(value: "small" | "medium" | "large") => setFontSize(value)}
                className="flex flex-row gap-4 pt-2"
              >
                {FONT_SIZES.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={`font-${option.value}`} />
                    <Label htmlFor={`font-${option.value}`} className="font-normal cursor-pointer">
                      {t(option.label)}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="activity">
          <AccordionTrigger className="text-xl font-semibold hover:no-underline">
            <div className="flex items-center gap-2">
              <Activity />
              <span>{t('My activity')}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 space-y-3">
            <p className="text-muted-foreground px-4">{t("Review content you've interacted with.")}</p>
            <SettingsLink href={profileHref}>{t('My posts and saved items')}</SettingsLink>
            <SettingsLink href={`${profileHref}?tab=reading`}>{t('My readings')}</SettingsLink>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="personalise">
          <AccordionTrigger className="text-xl font-semibold hover:no-underline">
            <div className="flex items-center gap-2">
              <Sparkles />
              <span>{t('Personalise feed')}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 space-y-3">
            <p className="text-muted-foreground px-4">
              {profile?.interests.length
                ? t('Your feed follows: {topics}.', { topics: profile.interests.slice(0, 6).map(topic).join(', ') })
                : t('Choose the subjects your feed should follow.')}
            </p>
            <SettingsLink href="/personalize">{t('Change my subjects')}</SettingsLink>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="notifications">
          <AccordionTrigger className="text-xl font-semibold hover:no-underline">
            <div className="flex items-center gap-2">
              <Bell />
              <span>{t('Notifications')}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 space-y-3">
            <p className="text-muted-foreground px-4">{t('Choose what we tell you about, and how.')}</p>
            <NotificationSettings />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="subscriptions">
          <AccordionTrigger className="text-xl font-semibold hover:no-underline">
            <div className="flex items-center gap-2">
              <BadgeDollarSign />
              <span>{t('Subscriptions')}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 space-y-3">
            <p className="text-muted-foreground px-4">{t('Manage your subscription plans (coming soon).')}</p>
            <div className="p-3 border rounded-lg text-center text-muted-foreground bg-muted/50">
              {t('Subscription management will be available here in a future update.')}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="language">
          <AccordionTrigger className="text-xl font-semibold hover:no-underline">
            <div className="flex items-center gap-2">
              <Languages />
              <span>{t('Language')}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 space-y-3">
            <p className="text-muted-foreground px-4">{t('Choose the language of the app. Posts and books stay in the language they were written in.')}</p>
            <div className="p-3 border rounded-lg space-y-2">
              <Label htmlFor="language-select">{t('App language')}</Label>
              <LanguageSelect id="language-select" />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="account">
          <AccordionTrigger className="text-xl font-semibold hover:no-underline">
            <div className="flex items-center gap-2">
              <User />
              <span>{t('Account')}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 space-y-3">
            <p className="text-muted-foreground px-4">{t('Manage your account details, privacy and security.')}</p>
            <SettingsLink href="/settings/account-details">{t('Account details')}</SettingsLink>
            <SettingsLink href="/settings/blocked">{t('Blocked people')}</SettingsLink>
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 border rounded-lg">
              <Button variant="outline" size="sm" onClick={() => void signOut()}>
                <LogOut className="mr-2 h-4 w-4" /> {t('Log out')}
              </Button>
              <DeleteAccountDialog />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="help">
          <AccordionTrigger className="text-xl font-semibold hover:no-underline">
            <div className="flex items-center gap-2">
              <HelpCircle />
              <span>{t('Help Centre')}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 space-y-3">
            <p className="text-muted-foreground px-4">{t('Find help and review our policies.')}</p>
            <SettingsLink href="/help">{t('Frequently asked questions')}</SettingsLink>
            <SettingsLink href="/legal/terms">{t('User Agreement')}</SettingsLink>
            <SettingsLink href="/legal/privacy">{t('Privacy Policy')}</SettingsLink>
            <SettingsLink href="/legal/community">{t('Community Guidelines')}</SettingsLink>
          </AccordionContent>
        </AccordionItem>

      </Accordion>
    </div>
  );
}
