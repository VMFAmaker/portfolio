"use client";

import { ExternalLink, FileText, Quote } from 'lucide-react';
import { useI18n } from '@/contexts/LanguageContext';
import { safeExternalUrl } from '@/lib/safe-url';
import type { ExternalPaper } from '@/lib/data/discover';
import { ImportButton } from '@/components/library/ImportButton';

/** A paper from OpenAlex, linking to the publisher/DOI and to a free copy when there is one. */
export function PaperResult({ paper }: { paper: ExternalPaper }) {
  const { t } = useI18n();
  const url = safeExternalUrl(paper.url);
  const free = safeExternalUrl(paper.openAccessUrl);
  return (
    <li className="rounded-lg border p-4 space-y-1.5">
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold hover:underline">
          {paper.title}
        </a>
      ) : (
        <p className="font-semibold">{paper.title}</p>
      )}
      <p className="text-sm text-muted-foreground">
        {[paper.authors.join(', ') + (paper.authors.length === 3 ? ' et al.' : ''), paper.year, paper.venue].filter(Boolean).join(' · ')}
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Quote className="h-3.5 w-3.5" /> {t('Cited {count} times', { count: paper.citedBy })}</span>
        {free && (
          <a href={free} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-1 font-medium text-primary hover:underline">
            <FileText className="h-3.5 w-3.5" /> {t('Free full text')}
          </a>
        )}
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-1 hover:underline">
            <ExternalLink className="h-3.5 w-3.5" /> {t('Publisher page')}
          </a>
        )}
      </div>
      {paper.pmcid && (
        <ImportButton request={{ source: 'europepmc', pmcid: paper.pmcid }} label={t('Read in Knowledgeable')} size="sm" variant="secondary" openReader />
      )}
    </li>
  );
}
