import { msg } from '@/lib/i18n/core';
import type { WorkKind } from '@/lib/types';

export const KIND_LABELS: Record<WorkKind, string> = {
  book: msg('Book'),
  paper: msg('Academic paper'),
  article: msg('Article'),
};

export const KIND_PLURALS: Record<WorkKind, string> = {
  book: msg('Books'),
  paper: msg('Academic papers'),
  article: msg('Articles'),
};
