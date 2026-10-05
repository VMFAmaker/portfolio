"use client";

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SubjectBubble } from '@/components/pfs/SubjectBubble';
import { MIN_INTERESTS, SUBJECTS, getSubject } from '@/lib/taxonomy';
import { useI18n } from '@/contexts/LanguageContext';

interface InterestPickerProps {
  value: string[];
  onChange: (next: string[]) => void;
}

/**
 * Personalized Feed Setup. Tap a subject to follow all of it; press and hold (or use the arrow)
 * to pick specific niche topics instead. Picking a whole subject shows every niche in the feed;
 * picking niches keeps it focused, with sibling niches surfacing occasionally.
 */
export function InterestPicker({ value, onChange }: InterestPickerProps) {
  const [openSubjectId, setOpenSubjectId] = useState<string | null>(null);
  const { t, topic } = useI18n();
  const selected = new Set(value);
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next));
  };

  const openSubject = openSubjectId ? getSubject(openSubjectId) : undefined;

  if (openSubject) {
    const niches = openSubject.nicheTopics ?? [];
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => setOpenSubjectId(null)} className="-ml-2">
          <ArrowLeft className="mr-2 h-4 w-4" /> {t('All subjects')}
        </Button>
        <div>
          <h2 className="text-2xl font-semibold">
            {openSubject.emoji} {topic(openSubject.id)}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('Pick the areas of {subject} you care about — or follow all of it.', { subject: topic(openSubject.id) })}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <SubjectBubble
            label={t('All of {subject}', { subject: topic(openSubject.id) })}
            emoji={openSubject.emoji}
            isSelected={selected.has(openSubject.id)}
            onClick={() => toggle(openSubject.id)}
          />
          {niches.map((niche) => (
            <SubjectBubble
              key={niche.id}
              label={topic(niche.id)}
              emoji={niche.emoji}
              isSelected={selected.has(niche.id)}
              onClick={() => toggle(niche.id)}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t('Choose at least {count}. Press and hold a subject (or tap its arrow) to pick specific topics.', { count: MIN_INTERESTS })}
      </p>
      <div className="flex flex-wrap gap-3">
        {SUBJECTS.map((subject) => {
          const nicheCount = (subject.nicheTopics ?? []).filter((n) => selected.has(n.id)).length;
          return (
            <SubjectBubble
              key={subject.id}
              label={topic(subject.id)}
              emoji={subject.emoji}
              isSelected={selected.has(subject.id)}
              nicheCount={nicheCount}
              onClick={() => toggle(subject.id)}
              onHold={subject.nicheTopics?.length ? () => setOpenSubjectId(subject.id) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
