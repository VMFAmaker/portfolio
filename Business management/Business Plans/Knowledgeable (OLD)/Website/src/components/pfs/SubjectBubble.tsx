"use client";

import { useRef } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useI18n } from '@/contexts/LanguageContext';

interface SubjectBubbleProps {
  label: string;
  emoji: string;
  isSelected: boolean;
  onClick: () => void;
  /** Press-and-hold (or the chevron) opens niche topics for this subject. */
  onHold?: () => void;
  /** How many niche topics are selected under this subject. */
  nicheCount?: number;
  className?: string;
}

const HOLD_MS = 450;

export function SubjectBubble({ label, emoji, isSelected, onClick, onHold, nicheCount = 0, className }: SubjectBubbleProps) {
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);
  const { t } = useI18n();

  const startHold = () => {
    if (!onHold) return;
    held.current = false;
    holdTimer.current = setTimeout(() => {
      held.current = true;
      onHold();
    }, HOLD_MS);
  };
  const cancelHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
  };

  return (
    <div className={cn("inline-flex items-stretch rounded-full", className)}>
      <button
        type="button"
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
        onContextMenu={(e) => onHold && e.preventDefault()}
        onClick={() => {
          if (held.current) {
            held.current = false;
            return;
          }
          onClick();
        }}
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 border-2 transition-all duration-150 ease-in-out select-none",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          onHold ? "rounded-l-full pr-3" : "rounded-full",
          isSelected
            ? "bg-primary text-primary-foreground border-primary shadow-md scale-[1.03]"
            : "bg-secondary text-secondary-foreground border-transparent hover:border-primary/60"
        )}
        aria-pressed={isSelected}
      >
        <span aria-hidden="true" className="text-lg leading-none">{emoji}</span>
        <span className="text-sm font-medium">{label}</span>
        {nicheCount > 0 && (
          <span className="ml-1 rounded-full bg-background/80 px-1.5 text-[11px] font-semibold text-foreground">
            +{nicheCount}
          </span>
        )}
      </button>
      {onHold && (
        <button
          type="button"
          onClick={onHold}
          aria-label={t('Choose specific {subject} topics', { subject: label })}
          className={cn(
            "flex items-center rounded-r-full border-2 border-l-0 px-2 transition-colors",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isSelected
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-secondary text-secondary-foreground border-transparent hover:border-primary/60"
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
