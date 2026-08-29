'use client';

import { ArrowRight, Banknote, Building2, FilePlus2, Gauge, Plus, ReceiptText, UserPlus, Wrench } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/src/i18n/i18n-context';
import { isSupabaseConfigured, supabase } from '@/src/lib/supabase';
import { formatMoney } from '@/src/utils/format';

const kpis = [
  ['kpi.totalRooms', Building2, 'bg-[#F4F7FE] text-[#4318FF] dark:bg-white/5 dark:text-violet-300'],
  ['kpi.occupied', Gauge, 'bg-[#E6FAF5] text-[#05CD99] dark:bg-emerald-400/10'],
  ['kpi.available', Building2, 'bg-[#E9F5FF] text-[#3965FF] dark:bg-blue-400/10'],
  ['kpi.outstanding', Banknote, 'bg-[#FFF5E8] text-[#FFB547] dark:bg-amber-400/10'],
] as const;
const actions = [
  ['action.addTenant', UserPlus, '/tenants'], ['action.addContract', FilePlus2, '/contracts'], ['action.recordMeter', Gauge, '/utilities'],
  ['action.receivePayment', ReceiptText, '/payments'], ['action.createInvoice', FilePlus2, '/invoices'], ['action.addExpense', Plus, '/expenses'],
] as const;

export function DashboardPage() {
  const { language, t } = useI18n();
  const [summary, setSummary] = useState({ total: 0, occupied: 0, available: 0, outstanding: 0 });
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const timer = window.setTimeout(() => void Promise.all([
      client.from('rooms').select('id', { count: 'exact', head: true }),
      client.from('rooms').select('id', { count: 'exact', head: true }).eq('status', 'occupied'),
      client.from('rooms').select('id', { count: 'exact', head: true }).eq('status', 'available'),
      client.from('invoices').select('balance').in('status', ['unpaid', 'partial', 'overdue']),
    ]).then(([total, occupied, available, balances]) => setSummary({ total: total.count ?? 0, occupied: occupied.count ?? 0, available: available.count ?? 0, outstanding: (balances.data ?? []).reduce((sum, row) => sum + Number(row.balance), 0) })), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const values = [String(summary.total), String(summary.occupied), String(summary.available), formatMoney(summary.outstanding, language)];
  const occupancy = summary.total > 0 ? Math.round((summary.occupied / summary.total) * 100) : 0;

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="mb-1 text-xs font-semibold text-[#A3AED0]">{t('app.tagline')} / {t('dashboard.title')}</p><h1 className="text-2xl font-bold tracking-tight text-[#2B3674] dark:text-white md:text-[32px]">{t('dashboard.title')}</h1><p className="mt-1 text-sm font-medium text-[#A3AED0]">{t('dashboard.subtitle')}</p></div><div className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#707EAE] shadow-[0_10px_25px_rgba(112,144,176,0.08)] dark:bg-[#111C44] dark:text-[#8F9BBA]">{t('dashboard.today')}</div></div>

    {!isSupabaseConfigured && <div className="flex flex-col gap-3 rounded-[20px] border border-primary/15 bg-primary/8 p-4 text-[#2B3674] dark:text-white sm:flex-row sm:items-center"><div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-white shadow-lg"><Building2 className="size-5" /></div><div className="flex-1"><p className="font-bold">{t('dashboard.setup.title')}</p><p className="mt-0.5 text-sm text-[#707EAE] dark:text-[#A3AED0]">{t('dashboard.setup.description')}</p></div><Button variant="outline" className="h-10 border-primary/20 bg-white text-primary dark:bg-white/5">{t('dashboard.setup.action')} <ArrowRight /></Button></div>}

    <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{kpis.map(([label, Icon, iconStyle], index) => <Card key={label} className="border-0 py-5 ring-0"><CardContent className="flex items-center justify-between gap-4"><div><p className="text-sm font-medium text-[#A3AED0]">{t(label)}</p><p className="mt-1 text-2xl font-bold tracking-tight text-[#2B3674] dark:text-white">{values[index]}</p>{!isSupabaseConfigured && <p className="mt-1 text-xs text-[#A3AED0]">{t('kpi.noData')}</p>}</div><div className={`grid size-14 place-items-center rounded-full ${iconStyle}`}><Icon className="size-6" /></div></CardContent></Card>)}</section>

    <section className="grid gap-5 xl:grid-cols-[1.6fr_0.8fr]">
      <Card className="border-0 py-5 ring-0"><CardHeader className="pb-1"><CardTitle className="text-lg font-bold text-[#2B3674] dark:text-white">{t('section.quickActions')}</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{actions.map(([label, Icon, path]) => <Link to={path} key={label} className="group flex min-h-24 flex-col justify-between rounded-2xl bg-[#F4F7FE] p-4 transition hover:-translate-y-0.5 hover:bg-primary hover:text-white hover:shadow-[0_12px_28px_rgba(67,24,255,0.20)] dark:bg-white/5 dark:hover:bg-primary"><Icon className="size-5 text-primary transition group-hover:text-white dark:text-violet-300" /><span className="mt-4 text-sm font-bold text-[#2B3674] transition group-hover:text-white dark:text-white">{t(label)}</span></Link>)}</div></CardContent></Card>
      <Card className="border-0 py-5 ring-0"><CardHeader className="pb-0"><CardTitle className="text-lg font-bold text-[#2B3674] dark:text-white">{t('section.occupancy')}</CardTitle></CardHeader><CardContent className="flex flex-col items-center justify-center"><div className="relative mt-2 grid size-40 place-items-center rounded-full" style={{ background: `conic-gradient(#7551FF ${occupancy * 3.6}deg, var(--muted) 0deg)` }}><div className="grid size-28 place-items-center rounded-full bg-card text-center"><div><p className="text-3xl font-bold text-[#2B3674] dark:text-white">{occupancy}%</p><p className="text-xs font-semibold text-[#A3AED0]">{t('kpi.occupied')}</p></div></div></div><div className="mt-5 flex w-full justify-around text-center"><div><p className="text-lg font-bold text-[#2B3674] dark:text-white">{summary.occupied}</p><p className="text-xs text-[#A3AED0]">{t('chart.occupied')}</p></div><div className="h-10 w-px bg-border"/><div><p className="text-lg font-bold text-[#2B3674] dark:text-white">{summary.available}</p><p className="text-xs text-[#A3AED0]">{t('chart.available')}</p></div></div></CardContent></Card>
    </section>

    <section className="grid gap-5 xl:grid-cols-2"><EmptyCard title={t('section.recentPayments')} icon={ReceiptText} emptyTitle={t('empty.payments.title')} emptyDescription={t('empty.payments.description')} /><EmptyCard title={t('section.attention')} icon={Wrench} emptyTitle={t('empty.attention.title')} emptyDescription={t('empty.attention.description')} /></section>
  </div>;
}

function EmptyCard({ title, icon: Icon, emptyTitle, emptyDescription }: { title: string; icon: typeof ReceiptText; emptyTitle: string; emptyDescription: string }) {
  return <Card className="min-h-64 border-0 py-5 ring-0"><CardHeader><CardTitle className="text-lg font-bold text-[#2B3674] dark:text-white">{title}</CardTitle></CardHeader><CardContent className="grid flex-1 place-items-center text-center"><div className="max-w-xs"><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#F4F7FE] text-primary dark:bg-white/5 dark:text-violet-300"><Icon className="size-5" /></div><p className="mt-3 font-bold text-[#2B3674] dark:text-white">{emptyTitle}</p><p className="mt-1 text-sm leading-6 text-[#A3AED0]">{emptyDescription}</p></div></CardContent></Card>;
}
