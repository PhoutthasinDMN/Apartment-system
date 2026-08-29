'use client';

import { useState } from 'react';
import { Bell, Building2, ChevronLeft, CircleDollarSign, ClipboardList, FileBarChart, FileText, Gauge, Menu, Search, Settings, ShieldCheck, Users, WalletCards, Wrench, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/contexts/auth-context';
import { useI18n } from '@/src/i18n/i18n-context';

const navigation = [
  ['nav.dashboard', Gauge, '/'], ['nav.rooms', Building2, '/rooms'], ['nav.tenants', Users, '/tenants'],
  ['nav.contracts', FileText, '/contracts'], ['nav.utilities', ClipboardList, '/utilities'], ['nav.billing', WalletCards, '/invoices'],
  ['nav.maintenance', Wrench, '/maintenance'], ['nav.finance', CircleDollarSign, '/expenses'], ['nav.reports', FileBarChart, '/reports'],
  ['nav.users', ShieldCheck, '/users'], ['nav.settings', Settings, '/settings'],
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { language, setLanguage, t } = useI18n();
  const { configured, signOut, user } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebar = (
    <>
      <div className="flex h-18 items-center gap-3 border-b border-white/10 px-4">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-500 text-white shadow-sm"><Building2 className="size-5" /></div>
        {!collapsed && <div className="min-w-0"><p className="truncate font-semibold text-white">{t('app.name')}</p><p className="truncate text-xs text-slate-400">{t('app.tagline')}</p></div>}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navigation.map(([label, Icon, path]) => (
          <NavLink key={label} to={path} onClick={() => setMobileOpen(false)} title={collapsed ? t(label) : undefined} className={({ isActive }) => cn('flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition-colors', isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-white/8 hover:text-white')}>
            <Icon className="size-4.5 shrink-0" />{!collapsed && <span className="truncate">{t(label)}</span>}
          </NavLink>
        ))}
      </nav>
      <button type="button" onClick={() => setCollapsed((value) => !value)} className="m-3 hidden h-9 items-center justify-center rounded-lg border border-white/10 text-slate-300 hover:bg-white/8 hover:text-white lg:flex" aria-label={t('common.collapse')}>
        <ChevronLeft className={cn('size-4 transition-transform', collapsed && 'rotate-180')} />
      </button>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside className={cn('fixed inset-y-0 left-0 z-30 hidden flex-col bg-slate-950 transition-[width] lg:flex', collapsed ? 'w-18' : 'w-64')}>{sidebar}</aside>
      {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><button className="absolute inset-0 bg-slate-950/60" onClick={() => setMobileOpen(false)} aria-label={t('common.closeMenu')} /><aside className="relative flex h-full w-72 flex-col bg-slate-950 shadow-2xl"><Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} className="absolute right-3 top-3 z-10 text-white hover:bg-white/10" aria-label={t('common.closeMenu')}><X /></Button>{sidebar}</aside></div>}
      <div className={cn('min-h-screen transition-[padding] lg:pl-64', collapsed && 'lg:pl-18')}>
        <header className="sticky top-0 z-20 flex h-18 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label={t('common.openMenu')}><Menu /></Button>
          <div className="relative hidden max-w-lg flex-1 md:block"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input className="h-10 border-slate-200 bg-slate-50 pl-9" placeholder={t('header.search')} /></div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-semibold"><button onClick={() => setLanguage('lo')} className={cn('rounded-md px-2.5 py-1.5', language === 'lo' && 'bg-white text-blue-700 shadow-sm')}>{t('common.lao')}</button><button onClick={() => setLanguage('en')} className={cn('rounded-md px-2.5 py-1.5', language === 'en' && 'bg-white text-blue-700 shadow-sm')}>{t('common.english')}</button></div>
            <Button variant="ghost" size="icon" className="relative" aria-label={t('header.notifications')}><Bell /><span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-red-500 ring-2 ring-white" /></Button>
            <button type="button" onClick={async () => { if (configured) { await signOut(); await navigate('/login'); } }} className="hidden items-center gap-2 border-l border-slate-200 pl-3 text-left sm:flex" title={t('header.logout')}><div className="grid size-9 place-items-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">{user?.email?.[0]?.toUpperCase() ?? 'A'}</div><div className="leading-tight"><p className="max-w-28 truncate text-sm font-semibold">{user?.email ?? t('header.profileRole')}</p><p className="text-xs text-slate-500">{t('header.profileRole')}</p></div></button>
          </div>
        </header>
        <main className="mx-auto max-w-[1600px] p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
