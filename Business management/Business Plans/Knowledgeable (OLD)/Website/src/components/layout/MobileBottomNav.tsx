"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/LanguageContext';
import { bottomBarItems, isActivePath } from '@/components/layout/nav';
import { cn } from '@/lib/utils';

/** Instagram-style tab bar, shown only on phone-sized screens. */
export function MobileBottomNav() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const { t } = useI18n();

  return (
    <>
      {/* Keeps the last bit of each page from hiding behind the bar. */}
      <div className="h-16 md:hidden" aria-hidden="true" />
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label={t('Main navigation')}
      >
        <ul className="grid h-16 grid-cols-5">
          {bottomBarItems(profile?.id).map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex h-full flex-col items-center justify-center gap-0.5 text-[11px]',
                    active ? 'text-primary' : 'text-muted-foreground'
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  <item.icon className={cn('h-6 w-6', active && 'stroke-[2.5]')} />
                  <span>{t(item.label)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
