'use client';

import { Building2, Gauge, Users, WalletCards, Wrench } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useI18n } from '@/src/i18n/i18n-context';

const bottomNav = [
  ['nav.dashboard', Gauge, '/'],
  ['nav.rooms', Building2, '/rooms'],
  ['nav.tenants', Users, '/tenants'],
  ['nav.billing', WalletCards, '/invoices'],
  ['nav.maintenance', Wrench, '/maintenance'],
] as const;

export function MobileNav() {
  const { t } = useI18n();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/70 bg-white/95 backdrop-blur-xl dark:border-white/8 dark:bg-[#111C44]/95 lg:hidden">
      <div className="flex items-center justify-around px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1">
        {bottomNav.map(([label, Icon, path]) => (
          <NavLink
            key={label}
            to={path}
            className={({ isActive }) =>
              cn(
                'flex min-h-[48px] min-w-[48px] flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-center transition',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('size-5', isActive && 'stroke-[2.5px]')} />
                <span className="text-[10px] font-semibold leading-tight">{t(label)}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
