'use client';

import { useEffect, useState } from 'react';
import { Bell, Building2, ChevronLeft, CircleDollarSign, ClipboardList, FileBarChart, FileText, Gauge, LogOut, Menu, Moon, Search, Settings, ShieldCheck, Sun, Users, WalletCards, Wrench, X } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAuth } from '@/src/contexts/auth-context';
import { useI18n } from '@/src/i18n/i18n-context';
import { useTheme } from '@/src/contexts/theme-context';
import { MobileNav } from '@/src/components/layout/mobile-nav';
import { supabase } from '@/src/lib/supabase';

const navigation = [
  ['nav.dashboard', Gauge, '/'], ['nav.rooms', Building2, '/rooms'], ['nav.tenants', Users, '/tenants'],
  ['nav.contracts', FileText, '/contracts'], ['nav.utilities', ClipboardList, '/utilities'], ['nav.billing', WalletCards, '/invoices'],
  ['nav.maintenance', Wrench, '/maintenance'], ['nav.finance', CircleDollarSign, '/expenses'], ['nav.reports', FileBarChart, '/reports'],
  ['nav.users', ShieldCheck, '/users'], ['nav.settings', Settings, '/settings'],
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { language, setLanguage, t } = useI18n();
  const { configured, profile, signOut, user } = useAuth();
  const navigate = useNavigate();
  const { dark, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    if (!configured || !user || !supabase) {
      return;
    }
    const client = supabase;
    let active = true;
    const loadNotifications = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { count, error } = await client
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .in('status', ['unpaid', 'partial', 'overdue'])
        .lt('due_date', today);
      if (active && !error) setNotificationCount(count ?? 0);
    };
    void loadNotifications();
    const timer = window.setInterval(loadNotifications, 60_000);
    window.addEventListener('focus', loadNotifications);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', loadNotifications);
    };
  }, [configured, user]);
  const sidebar = (mobile = false) => {
    const compact = collapsed && !mobile;
    return <>
      <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-5 sm:h-24 dark:border-white/8">
        <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary text-white shadow-[0_10px_24px_rgba(67,24,255,0.28)] sm:size-11"><Building2 className="size-5" /></div>
        {!compact && <div className="min-w-0"><p className="truncate text-sm font-bold tracking-tight text-[#2B3674] dark:text-white sm:text-base">{t('app.name')}</p><p className="truncate text-xs font-medium text-[#A3AED0]">{t('app.tagline')}</p></div>}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 sm:space-y-1.5 sm:py-5">
        {navigation.map(([label, Icon, path]) => <NavLink key={label} to={path} onClick={() => setMobileOpen(false)} title={compact ? t(label) : undefined} className={({ isActive }) => cn('group relative flex h-11 w-full items-center gap-3 rounded-xl px-3.5 text-left text-sm font-semibold transition-all', isActive ? 'bg-primary/10 text-primary dark:bg-primary/18 dark:text-violet-300' : 'text-[#A3AED0] hover:bg-[#F4F7FE] hover:text-[#2B3674] dark:text-[#8F9BBA] dark:hover:bg-white/5 dark:hover:text-white')}>
          <Icon className="size-[19px] shrink-0" />{!compact && <span className="truncate">{t(label)}</span>}
          <span className="absolute inset-y-2 right-0 w-1 rounded-l-full bg-primary opacity-0 group-[.active]:opacity-100" />
        </NavLink>)}
      </nav>
      {mobile && <div className="mx-3 mb-[max(0.75rem,env(safe-area-inset-bottom))] flex rounded-xl bg-[#F4F7FE] p-1 text-xs font-bold dark:bg-white/5">
        <button type="button" onClick={() => setLanguage('lo')} className={cn('min-h-11 flex-1 rounded-lg px-3 transition', language === 'lo' ? 'bg-white text-primary shadow-sm dark:bg-white/10 dark:text-violet-300' : 'text-[#A3AED0]')}>{t('common.lao')}</button>
        <button type="button" onClick={() => setLanguage('en')} className={cn('min-h-11 flex-1 rounded-lg px-3 transition', language === 'en' ? 'bg-white text-primary shadow-sm dark:bg-white/10 dark:text-violet-300' : 'text-[#A3AED0]')}>{t('common.english')}</button>
      </div>}
      <button type="button" onClick={() => setCollapsed((value) => !value)} className="m-3 hidden h-10 items-center justify-center rounded-xl border border-slate-100 text-[#A3AED0] transition hover:bg-[#F4F7FE] hover:text-primary dark:border-white/8 dark:hover:bg-white/5 lg:flex" aria-label={t('common.collapse')}><ChevronLeft className={cn('size-4 transition-transform', compact && 'rotate-180')} /></button>
    </>;
  };

  return <div className="min-h-dvh bg-background text-foreground transition-colors">
    <aside className={cn('fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-slate-100 bg-white transition-[width] dark:border-white/8 dark:bg-[#111C44] lg:flex', collapsed ? 'w-20' : 'w-[290px]')}>{sidebar()}</aside>
    {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><button className="absolute inset-0 bg-[#0B1437]/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-label={t('common.closeMenu')} /><aside className="relative flex h-full w-[280px] flex-col bg-white shadow-2xl dark:bg-[#111C44] sm:w-[290px]"><Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} className="absolute right-3 top-3 z-10 min-h-11 min-w-11" aria-label={t('common.closeMenu')}><X /></Button>{sidebar(true)}</aside></div>}
    <div className={cn('min-h-dvh transition-[padding] lg:pl-[290px]', collapsed && 'lg:pl-20')}>
      <header className="sticky top-0 z-20 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-4 sm:pt-4 md:px-6 lg:px-8">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-2 rounded-[16px] border border-white/70 bg-white/82 px-2.5 shadow-[0_12px_30px_rgba(112,144,176,0.10)] backdrop-blur-xl sm:h-16 sm:gap-3 sm:rounded-[20px] sm:px-3 dark:border-white/8 dark:bg-[#111C44]/88 dark:shadow-[0_12px_30px_rgba(2,8,23,0.32)]">
          <Button variant="ghost" size="icon" className="min-h-10 min-w-10 lg:hidden" onClick={() => setMobileOpen(true)} aria-label={t('common.openMenu')}><Menu /></Button>
          <div className="relative hidden max-w-lg flex-1 md:block"><Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#A3AED0]" /><Input className="h-10 border-0 bg-[#F4F7FE] pl-10 shadow-none dark:bg-white/5" placeholder={t('header.search')} /></div>
          <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
            <div className="hidden rounded-xl bg-[#F4F7FE] p-1 text-xs font-bold dark:bg-white/5 sm:flex"><button onClick={() => setLanguage('lo')} className={cn('rounded-lg px-2.5 py-1.5 transition', language === 'lo' ? 'bg-white text-primary shadow-sm dark:bg-white/10 dark:text-violet-300' : 'text-[#A3AED0]')}>{t('common.lao')}</button><button onClick={() => setLanguage('en')} className={cn('rounded-lg px-2.5 py-1.5 transition', language === 'en' ? 'bg-white text-primary shadow-sm dark:bg-white/10 dark:text-violet-300' : 'text-[#A3AED0]')}>{t('common.english')}</button></div>
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="min-h-9 min-w-9 rounded-xl text-[#A3AED0] hover:text-primary sm:min-h-10 sm:min-w-10" aria-label={dark ? t('common.lightMode') : t('common.darkMode')}>{dark ? <Sun /> : <Moon />}</Button>
            <Button variant="ghost" size="icon" className="relative min-h-9 min-w-9 rounded-xl text-[#A3AED0] hover:text-primary sm:min-h-10 sm:min-w-10" aria-label={`${t('header.notifications')}: ${notificationCount}`}><Bell />{notificationCount > 0 && <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#FF5252] px-1 text-[10px] font-extrabold leading-none text-white ring-2 ring-white dark:ring-[#111C44]">{notificationCount > 99 ? '99+' : notificationCount}</span>}</Button>
            <button type="button" onClick={async () => { if (configured) { await signOut(); await navigate('/login'); } }} className="ml-0.5 flex items-center gap-2 rounded-xl p-1 text-left transition hover:bg-[#F4F7FE] sm:ml-1 dark:hover:bg-white/5" title={t('header.logout')}><div className="grid size-8 place-items-center rounded-xl bg-primary text-xs font-bold text-white shadow-md sm:size-9">{profile?.fullName?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? 'A'}</div><div className="hidden leading-tight xl:block"><p className="max-w-32 truncate text-xs font-bold text-[#2B3674] dark:text-white">{profile?.fullName ?? user?.email ?? t('header.profileRole')}</p><p className="text-[11px] font-medium text-[#A3AED0]">{profile?.roleName ?? t('header.profileRole')}</p></div>{configured && <LogOut className="hidden size-4 text-[#A3AED0] xl:block" />}</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] p-3 pt-4 pb-20 sm:p-4 sm:pt-6 sm:pb-6 md:p-6 md:pt-7 md:pb-6 lg:p-8 lg:pt-7 lg:pb-8">{children}</main>
    </div>
    <MobileNav />
  </div>;
}
