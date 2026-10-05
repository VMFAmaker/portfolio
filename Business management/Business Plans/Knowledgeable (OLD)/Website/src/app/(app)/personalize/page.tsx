"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InterestPicker } from '@/components/pfs/InterestPicker';
import { useCurrentUser } from '@/contexts/AuthContext';
import { updateProfileFields } from '@/lib/data/profiles';
import { MIN_INTERESTS } from '@/lib/taxonomy';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/contexts/LanguageContext';

export default function PersonalizeFeedPage() {
  const { profile } = useCurrentUser();
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const [interests, setInterests] = useState<string[]>(profile.interests);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateProfileFields(profile.id, { interests });
      toast({ title: t('Feed updated'), description: t('Your feed now follows your new interests.') });
      router.push('/');
    } catch {
      toast({ title: t('Could not save'), description: t('Please try again.'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full space-y-6 py-4">
      <div>
        <h1 className="text-3xl font-bold">{t('Personalise your feed')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('Your feed shows these subjects first, with the occasional related topic to widen your horizons.')}
        </p>
      </div>
      <InterestPicker value={interests} onChange={setInterests} />
      <div className="flex items-center justify-end gap-3 border-t pt-4">
        <span className="text-sm text-muted-foreground">{t('{count} selected', { count: interests.length })}</span>
        <Button onClick={save} disabled={interests.length < MIN_INTERESTS || saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('Save')}
        </Button>
      </div>
    </div>
  );
}
