import { msg } from '@/lib/i18n/core';
import type { HighlightColour } from '@/lib/types';

export const HIGHLIGHT_COLOURS: Array<{ value: HighlightColour; label: string; swatch: string }> = [
  { value: 'yellow', label: msg('Yellow'), swatch: 'bg-yellow-300' },
  { value: 'blue', label: msg('Blue'), swatch: 'bg-sky-300' },
  { value: 'green', label: msg('Green'), swatch: 'bg-emerald-300' },
  { value: 'pink', label: msg('Pink'), swatch: 'bg-pink-300' },
];

const MARK_CLASSES: Record<HighlightColour, string> = {
  yellow: 'bg-yellow-200/80 dark:bg-yellow-400/30',
  blue: 'bg-sky-200/80 dark:bg-sky-400/30',
  green: 'bg-emerald-200/80 dark:bg-emerald-400/30',
  pink: 'bg-pink-200/80 dark:bg-pink-400/30',
};

export function highlightClass(colour: string): string {
  return MARK_CLASSES[colour as HighlightColour] ?? MARK_CLASSES.yellow;
}
