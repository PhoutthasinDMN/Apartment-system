'use client';

import { ArrowRight, Banknote, Building2, FilePlus2, Gauge, Plus, ReceiptText, UserPlus, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n, type TranslationKey } from '@/src/i18n/i18n-context';
import { isSupabaseConfigured, supabase } from '@/src/lib/supabase';
import { formatMoney } from '@/src/utils/format';

const kpis = [
  ['kpi.totalRooms', Building2, 'text-blue-700', 'bg-blue-50'],
  ['kpi.occupied', Gauge, 'text-emerald-700', 'bg-emerald-50'],
  ['kpi.available', Building2, 'text-sky-700', 'bg-sky-50'],
  ['kpi.outstanding', Banknote, 'text-amber-700', 'bg-amber-50'],
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
  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">{t('dashboard.title')}</h1><p className="mt-1 text-sm text-slate-500">{t('dashboard.subtitle')}</p></div><p className="text-sm font-medium text-slate-500">{t('dashboard.today')}</p></div>
    {!isSupabaseConfigured && <div className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-950 sm:flex-row sm:items-center"><div className="grid size-10 shrink-0 place-items-center rounded-lg bg-blue-600 text-white"><Building2 className="size-5" /></div><div className="flex-1"><p className="font-semibold">{t('dashboard.setup.title')}</p><p className="mt-0.5 text-sm text-blue-800">{t('dashboard.setup.description')}</p></div><Button variant="outline" className="h-9 border-blue-300 bg-white text-blue-700 hover:bg-blue-100">{t('dashboard.setup.action')} <ArrowRight /></Button></div>}
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{kpis.map(([label, Icon, color, background], index) => <Card key={label} className="border-0 shadow-sm ring-1 ring-slate-200/80"><CardContent className="flex items-center gap-4 py-1"><div className={`grid size-11 place-items-center rounded-xl ${background} ${color}`}><Icon className="size-5" /></div><div><p className="text-sm font-medium text-slate-500">{t(label)}</p><p className="mt-1 text-2xl font-bold tabular-nums">{values[index]}</p>{!isSupabaseConfigured && <p className="text-xs text-slate-400">{t('kpi.noData')}</p>}</div></CardContent></Card>)}</section>
    <section><h2 className="mb-3 text-base font-semibold text-slate-900">{t('section.quickActions')}</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">{actions.map(([label, Icon, path]) => <Link to={path} key={label} className="group flex min-h-24 flex-col items-start justify-between rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md"><Icon className="size-5 text-blue-600" /><span className="mt-4 text-sm font-semibold text-slate-800 group-hover:text-blue-700">{t(label)}</span></Link>)}</div></section>
    <section className="grid gap-4 xl:grid-cols-[1.2fr_1fr_1fr]"><EmptyCard title={t('section.recentPayments')} icon={ReceiptText} emptyTitle={t('empty.payments.title')} emptyDescription={t('empty.payments.description')} /><EmptyCard title={t('section.attention')} icon={Wrench} emptyTitle={t('empty.attention.title')} emptyDescription={t('empty.attention.description')} /><Card className="border-0 shadow-sm ring-1 ring-slate-200/80"><CardHeader><CardTitle>{t('section.occupancy')}</CardTitle></CardHeader><CardContent><div className="mb-5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-0 rounded-full bg-blue-600" /></div><div className="space-y-3 text-sm">{([['chart.occupied', 'bg-emerald-500'], ['chart.available', 'bg-blue-500'], ['chart.other', 'bg-slate-400']] as const).map(([label, color]) => <div key={label} className="flex items-center justify-between"><span className="flex items-center gap-2 text-slate-600"><span className={`size-2 rounded-full ${color}`} />{t(label as TranslationKey)}</span><strong>0</strong></div>)}</div></CardContent></Card></section>
  </div>;
}

function EmptyCard({ title, icon: Icon, emptyTitle, emptyDescription }: { title: string; icon: typeof ReceiptText; emptyTitle: string; emptyDescription: string }) {
  return <Card className="min-h-64 border-0 shadow-sm ring-1 ring-slate-200/80"><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="grid flex-1 place-items-center text-center"><div className="max-w-xs"><div className="mx-auto grid size-11 place-items-center rounded-full bg-slate-100 text-slate-500"><Icon className="size-5" /></div><p className="mt-3 font-semibold text-slate-800">{emptyTitle}</p><p className="mt-1 text-sm leading-6 text-slate-500">{emptyDescription}</p></div></CardContent></Card>;
}
