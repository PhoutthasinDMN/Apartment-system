'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { FileDown, LoaderCircle, Plus, RefreshCw, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { type Resolver, useForm } from 'react-hook-form';
import Swal from 'sweetalert2';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { isSupabaseConfigured, supabase } from '@/src/lib/supabase';
import { useTheme } from '@/src/contexts/theme-context';
import { useI18n, type TranslationKey } from '@/src/i18n/i18n-context';
import { formatDate, formatMoney } from '@/src/utils/format';

export type ModuleName = 'buildings' | 'rooms' | 'tenants' | 'contracts' | 'utilities' | 'invoices' | 'payments' | 'maintenance' | 'expenses' | 'reports' | 'users' | 'settings';
type FieldType = 'text' | 'number' | 'date' | 'month' | 'select' | 'email';
interface FieldConfig { name: string; label: TranslationKey; type: FieldType; required?: boolean; optionSource?: 'buildings' | 'rooms' | 'tenants' | 'contracts' | 'invoices' | 'categories'; options?: readonly string[]; }
interface ModuleConfig { title: TranslationKey; help: TranslationKey; table: string; select: string; columns: readonly [string, TranslationKey, 'text' | 'money' | 'date' | 'status'][]; fields: readonly FieldConfig[]; readOnly?: boolean; }
type Row = Record<string, unknown>;
type FormValues = Record<string, string>;

const configs: Record<ModuleName, ModuleConfig> = {
  buildings: { title: 'module.buildings', help: 'module.buildingsHelp', table: 'buildings', select: 'id,code,name,address,floors,is_active', columns: [['code','field.code','text'],['name','field.name','text'],['address','field.address','text'],['floors','field.floors','text']], fields: [{name:'code',label:'field.code',type:'text',required:true},{name:'name',label:'field.name',type:'text',required:true},{name:'address',label:'field.address',type:'text'},{name:'floors',label:'field.floors',type:'number',required:true}] },
  rooms: { title: 'module.rooms', help: 'module.roomsHelp', table: 'rooms', select: 'id,room_number,building_id,floor,monthly_rent,default_deposit,status', columns: [['room_number','field.roomNumber','text'],['building_id','field.building','text'],['floor','field.floor','text'],['monthly_rent','field.monthlyRent','money'],['status','common.status','status']], fields: [{name:'room_number',label:'field.roomNumber',type:'text',required:true},{name:'building_id',label:'field.building',type:'select',required:true,optionSource:'buildings'},{name:'floor',label:'field.floor',type:'number',required:true},{name:'monthly_rent',label:'field.monthlyRent',type:'number',required:true},{name:'default_deposit',label:'field.deposit',type:'number',required:true},{name:'status',label:'common.status',type:'select',required:true,options:['available','reserved','maintenance','disabled']}] },
  tenants: { title: 'module.tenants', help: 'module.tenantsHelp', table: 'tenants', select: 'id,tenant_code,full_name_lo,full_name_en,phone,email,is_active', columns: [['tenant_code','field.tenantCode','text'],['full_name_lo','field.fullNameLo','text'],['phone','field.phone','text'],['email','field.email','text']], fields: [{name:'tenant_code',label:'field.tenantCode',type:'text',required:true},{name:'full_name_lo',label:'field.fullNameLo',type:'text',required:true},{name:'full_name_en',label:'field.fullNameEn',type:'text'},{name:'phone',label:'field.phone',type:'text',required:true},{name:'email',label:'field.email',type:'email'},{name:'identity_number',label:'field.identity',type:'text'}] },
  contracts: { title: 'module.contracts', help: 'module.contractsHelp', table: 'contracts', select: 'id,contract_no,tenant_id,room_id,start_date,end_date,monthly_rent,deposit_amount,status', columns: [['contract_no','field.contractNo','text'],['tenant_id','field.tenant','text'],['room_id','field.room','text'],['start_date','field.startDate','date'],['end_date','field.endDate','date'],['status','common.status','status']], fields: [{name:'contract_no',label:'field.contractNo',type:'text',required:true},{name:'tenant_id',label:'field.tenant',type:'select',required:true,optionSource:'tenants'},{name:'room_id',label:'field.room',type:'select',required:true,optionSource:'rooms'},{name:'start_date',label:'field.startDate',type:'date',required:true},{name:'end_date',label:'field.endDate',type:'date',required:true},{name:'monthly_rent',label:'field.monthlyRent',type:'number',required:true},{name:'deposit_amount',label:'field.deposit',type:'number',required:true},{name:'payment_due_day',label:'field.dueDay',type:'number',required:true},{name:'electricity_rate',label:'field.electricityRate',type:'number',required:true},{name:'water_rate',label:'field.waterRate',type:'number',required:true}] },
  utilities: { title: 'module.utilities', help: 'module.utilitiesHelp', table: 'meter_readings', select: 'id,room_id,meter_type,billing_month,previous_reading,current_reading,units_used,rate,amount', columns: [['room_id','field.room','text'],['meter_type','field.type','text'],['billing_month','field.billingMonth','date'],['previous_reading','field.previousReading','text'],['current_reading','field.currentReading','text'],['units_used','field.units','text'],['amount','common.amount','money']], fields: [{name:'room_id',label:'field.room',type:'select',required:true,optionSource:'rooms'},{name:'meter_type',label:'field.type',type:'select',required:true,options:['electricity','water']},{name:'billing_month',label:'field.billingMonth',type:'month',required:true},{name:'reading_date',label:'common.date',type:'date',required:true},{name:'previous_reading',label:'field.previousReading',type:'number',required:true},{name:'current_reading',label:'field.currentReading',type:'number',required:true},{name:'rate',label:'common.amount',type:'number',required:true}] },
  invoices: { title: 'module.invoices', help: 'module.invoicesHelp', table: 'invoices', select: 'id,invoice_no,billing_month,room_id,tenant_id,due_date,total,paid,balance,status', columns: [['invoice_no','field.invoiceNo','text'],['room_id','field.room','text'],['billing_month','field.billingMonth','date'],['due_date','field.dueDate','date'],['total','field.total','money'],['paid','field.paid','money'],['balance','field.balance','money'],['status','common.status','status']], fields: [], readOnly: true },
  payments: { title: 'module.payments', help: 'module.paymentsHelp', table: 'payments', select: 'id,payment_no,receipt_no,invoice_id,room_id,amount,payment_date,payment_method', columns: [['receipt_no','field.receiptNo','text'],['invoice_id','field.invoiceNo','text'],['room_id','field.room','text'],['amount','common.amount','money'],['payment_date','common.date','date'],['payment_method','field.method','text']], fields: [{name:'invoice_id',label:'field.invoiceNo',type:'select',required:true,optionSource:'invoices'},{name:'amount',label:'common.amount',type:'number',required:true},{name:'payment_method',label:'field.method',type:'select',required:true,options:['cash','bank_transfer','qr','other']}] },
  maintenance: { title: 'module.maintenance', help: 'module.maintenanceHelp', table: 'maintenance_requests', select: 'id,ticket_no,room_id,issue,category,priority,due_date,cost,status', columns: [['ticket_no','field.code','text'],['room_id','field.room','text'],['issue','field.issue','text'],['category','field.category','text'],['priority','field.priority','status'],['due_date','field.dueDate','date'],['status','common.status','status']], fields: [{name:'ticket_no',label:'field.code',type:'text',required:true},{name:'room_id',label:'field.room',type:'select',optionSource:'rooms'},{name:'issue',label:'field.issue',type:'text',required:true},{name:'category',label:'field.category',type:'text',required:true},{name:'priority',label:'field.priority',type:'select',required:true,options:['low','normal','high','urgent']},{name:'description',label:'field.description',type:'text'},{name:'due_date',label:'field.dueDate',type:'date'}] },
  expenses: { title: 'module.expenses', help: 'module.expensesHelp', table: 'expenses', select: 'id,expense_no,expense_date,description,amount,supplier,payment_method', columns: [['expense_no','field.code','text'],['expense_date','common.date','date'],['description','field.description','text'],['supplier','field.supplier','text'],['amount','common.amount','money'],['payment_method','field.method','text']], fields: [{name:'expense_no',label:'field.code',type:'text',required:true},{name:'expense_date',label:'common.date',type:'date',required:true},{name:'category_id',label:'field.category',type:'select',required:true,optionSource:'categories'},{name:'description',label:'field.description',type:'text',required:true},{name:'amount',label:'common.amount',type:'number',required:true},{name:'supplier',label:'field.supplier',type:'text'},{name:'payment_method',label:'field.method',type:'select',required:true,options:['cash','bank_transfer','qr','other']}] },
  reports: { title: 'module.reports', help: 'module.reportsHelp', table: 'invoices', select: 'id,invoice_no,billing_month,total,paid,balance,status', columns: [['billing_month','field.billingMonth','date'],['invoice_no','field.invoiceNo','text'],['total','field.total','money'],['paid','field.paid','money'],['balance','field.balance','money'],['status','common.status','status']], fields: [], readOnly: true },
  users: { title: 'module.users', help: 'module.usersHelp', table: 'profiles', select: 'id,full_name,phone,is_active,created_at', columns: [['full_name','field.name','text'],['phone','field.phone','text'],['is_active','common.status','text'],['created_at','common.date','date']], fields: [], readOnly: true },
  settings: { title: 'module.settings', help: 'module.settingsHelp', table: 'settings', select: 'id,property_name_lo,property_name_en,phone,email,currency,timezone', columns: [['property_name_lo','field.name','text'],['phone','field.phone','text'],['email','field.email','text'],['currency','common.amount','text'],['timezone','common.date','text']], fields: [], readOnly: true },
};

export function ModulePage({ module }: { module: ModuleName }) {
  const config = configs[module];
  const { language, t } = useI18n();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<Record<string, { value: string; label: string }[]>>({});

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    if (!supabase) { setRows([]); setLoading(false); return; }
    const { data, error: requestError } = await supabase.from(config.table).select(config.select).limit(100);
    if (requestError) setError(true); else setRows((data ?? []) as unknown as Row[]);
    setLoading(false);
  }, [config]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  const filtered = useMemo(() => rows.filter((row) => JSON.stringify(row).toLowerCase().includes(query.toLowerCase())), [query, rows]);
  const exportCsv = () => {
    const headers = config.columns.map(([key]) => key);
    const csv = [headers.join(','), ...filtered.map((row) => headers.map((key) => JSON.stringify(row[key] ?? '')).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `${module}.csv`; link.click(); URL.revokeObjectURL(url);
  };
  const openForm = async () => {
    const client = supabase;
    if (!client) { setOpen(true); return; }
    const sources = [...new Set(config.fields.map((field) => field.optionSource).filter(Boolean))];
    const next: Record<string, { value: string; label: string }[]> = {};
    await Promise.all(sources.map(async (source) => {
      if (!source) return;
      const maps = { buildings: ['buildings','id,code,name'], rooms: ['rooms','id,room_number'], tenants: ['tenants','id,tenant_code,full_name_lo,full_name_en'], contracts: ['contracts','id,contract_no'], invoices: ['invoices','id,invoice_no,balance,status'], categories: ['expense_categories','id,name_lo,name_en'] } as const;
      const [table, select] = maps[source]; const tableName: string = table; const columns: string = select; const { data } = await client.from(tableName).select(columns).limit(500);
      next[source] = ((data ?? []) as unknown as Row[]).filter((row) => source !== 'invoices' || (row.status !== 'paid' && row.status !== 'cancelled')).map((row) => ({ value: String(row.id), label: String(row.name ?? row.room_number ?? row.full_name_lo ?? row.contract_no ?? row.invoice_no ?? row.name_lo ?? row.code ?? row.id) }));
    }));
    setOptions(next); setOpen(true);
  };

  return <div className="space-y-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Horizon Workspace</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground md:text-3xl">{t(config.title)}</h1><p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t(config.help)}</p></div><div className="flex gap-2">{module === 'reports' && <Button className="rounded-xl" variant="outline" onClick={exportCsv}><FileDown />CSV</Button>}{!config.readOnly && <Button className="rounded-xl" onClick={() => void openForm()}><Plus />{t('common.add')}</Button>}</div></div>
    {!isSupabaseConfigured && <div className="rounded-2xl border border-amber-200/70 bg-amber-50/90 p-4 dark:border-amber-400/20 dark:bg-amber-400/10"><p className="font-semibold text-amber-900 dark:text-amber-200">{t('setup.title')}</p><p className="mt-1 text-sm text-amber-800 dark:text-amber-300">{t('setup.description')}</p></div>}
    <Card className="overflow-hidden border-0 py-0"><CardContent className="p-0"><div className="flex gap-2 border-b border-border/70 bg-card/80 p-4"><div className="relative max-w-sm flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 rounded-xl bg-background/70 pl-9" placeholder={t('common.search')} /></div><Button className="rounded-xl" variant="outline" size="icon-lg" onClick={() => void load()} aria-label={t('common.refresh')}><RefreshCw /></Button></div>
      {loading ? <div className="grid min-h-64 place-items-center text-muted-foreground"><LoaderCircle className="size-6 animate-spin text-primary" /></div> : error ? <div className="grid min-h-64 place-items-center text-center"><div><p className="font-semibold text-destructive">{t('common.error')}</p><Button variant="outline" className="mt-3 rounded-xl" onClick={() => void load()}>{t('common.refresh')}</Button></div></div> : filtered.length === 0 ? <div className="grid min-h-64 place-items-center px-4 text-center"><div><p className="font-semibold text-foreground">{t('common.noRecords')}</p><p className="mt-1 text-sm text-muted-foreground">{t('common.noRecordsHelp')}</p></div></div> : <Table><TableHeader className="bg-muted/40"><TableRow>{config.columns.map(([key,label]) => <TableHead className="h-12 px-5 text-xs font-bold uppercase tracking-wider text-muted-foreground" key={key}>{t(label)}</TableHead>)}</TableRow></TableHeader><TableBody>{filtered.map((row) => <TableRow className="h-14 border-border/60 hover:bg-primary/[0.035] dark:hover:bg-white/[0.035]" key={String(row.id)}>{config.columns.map(([key,,kind]) => <TableCell className="px-5 text-foreground" key={key}>{renderCell(row[key],kind,language,t)}</TableCell>)}</TableRow>)}</TableBody></Table>}
    </CardContent></Card>{!config.readOnly && <RecordDialog open={open} onOpenChange={setOpen} module={module} config={config} options={options} onSaved={load} />}</div>;
}

function displayValue(value: unknown) { return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : '—'; }

function renderCell(value: unknown, kind: 'text' | 'money' | 'date' | 'status', language: 'lo' | 'en', t: (key: TranslationKey) => string) {
  if (kind === 'money') return <span className="font-medium tabular-nums">{formatMoney(Number(value ?? 0), language)}</span>;
  if (kind === 'date') return formatDate(displayValue(value));
  if (kind === 'status') { const raw = displayValue(value); const key = `status.${raw}` as TranslationKey; return <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-violet-200">{t(key) ?? raw}</span>; }
  return displayValue(value);
}

function RecordDialog({ open, onOpenChange, module, config, options, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; module: ModuleName; config: ModuleConfig; options: Record<string, {value:string;label:string}[]>; onSaved: () => Promise<void> }) {
  const { t } = useI18n();
  const { dark } = useTheme();
  const shape = Object.fromEntries(config.fields.map((field) => [field.name, field.required ? z.string().min(1, t('common.required')) : z.string().optional()]));
  const schema = z.object(shape);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) as Resolver<FormValues> });
  const submit = handleSubmit(async (values) => {
    if (!supabase) { await Swal.fire({ icon:'warning', title:t('setup.title'), text:t('setup.description'), confirmButtonColor:'#4318ff', background:dark ? '#111c44' : '#ffffff', color:dark ? '#ffffff' : '#1b2559' }); return; }
    const payload: Record<string, unknown> = {};
    for (const field of config.fields) payload[field.name] = field.type === 'number' ? Number(values[field.name]) : field.type === 'month' ? `${values[field.name]}-01` : values[field.name] || null;
    if (module === 'contracts') payload.status = 'draft';
    if (module === 'maintenance') { payload.status = 'open'; payload.cost = 0; }
    let requestError: { message: string } | null = null;
    if (module === 'payments') {
      const stamp = crypto.randomUUID().slice(0, 8).toUpperCase();
      const { error } = await supabase.rpc('receive_payment', { target_invoice_id: payload.invoice_id, payment_amount: payload.amount, method: payload.payment_method, bank_name: null, payment_reference: null, slip_path: null, payment_notes: null, payment_number: `PAY-${stamp}`, receipt_number: `REC-${stamp}`, request_key: crypto.randomUUID() });
      requestError = error;
    } else {
      const { error } = await supabase.from(config.table).insert(payload);
      requestError = error;
    }
    if (requestError) { await Swal.fire({ icon:'error', title:t('common.error'), confirmButtonColor:'#4318ff', background:dark ? '#111c44' : '#ffffff', color:dark ? '#ffffff' : '#1b2559' }); return; }
    await Swal.fire({ icon:'success', title:t('common.saved'), timer:1200, showConfirmButton:false, background:dark ? '#111c44' : '#ffffff', color:dark ? '#ffffff' : '#1b2559' }); reset(); onOpenChange(false); await onSaved();
  });
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border-0 p-6 shadow-2xl ring-1 ring-border sm:max-w-xl"><DialogHeader><DialogTitle className="text-xl font-bold text-foreground">{t('common.add')} {t(config.title)}</DialogTitle><DialogDescription>{t(config.help)}</DialogDescription></DialogHeader><form id={`form-${module}`} className="grid gap-4 py-2 sm:grid-cols-2" onSubmit={submit}>{config.fields.map((field) => <div key={field.name} className="space-y-2"><Label className="font-semibold text-foreground" htmlFor={`${module}-${field.name}`}>{t(field.label)}</Label>{field.type === 'select' ? <select id={`${module}-${field.name}`} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" {...register(field.name)}><option value="">—</option>{field.options?.map((value) => <option key={value} value={value}>{value}</option>)}{field.optionSource && options[field.optionSource]?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <Input id={`${module}-${field.name}`} type={field.type} step={field.type === 'number' ? 'any' : undefined} className="h-10" {...register(field.name)} />}{errors[field.name] && <p className="text-xs text-destructive">{String(errors[field.name]?.message)}</p>}</div>)}</form><DialogFooter className="-mx-6 -mb-6 rounded-b-2xl px-6"><Button className="rounded-xl" variant="outline" type="button" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button><Button className="rounded-xl" type="submit" form={`form-${module}`} disabled={isSubmitting}>{isSubmitting && <LoaderCircle className="animate-spin" />}{t('common.save')}</Button></DialogFooter></DialogContent></Dialog>;
}
