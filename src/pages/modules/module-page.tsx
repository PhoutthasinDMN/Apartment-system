'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowUpDown, Banknote, Bookmark, CalendarDays, ChevronLeft, ChevronRight, FileDown, LoaderCircle, Pencil, Plus, Power, RefreshCw, Search, UserPlus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type Resolver, useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
type OptionSource = 'buildings' | 'rooms' | 'tenants' | 'contracts' | 'invoices' | 'categories';
interface FieldConfig { name: string; label: TranslationKey; type: FieldType; required?: boolean; optionSource?: OptionSource; options?: readonly string[]; }
interface ModuleConfig { title: TranslationKey; help: TranslationKey; table: string; select: string; columns: readonly [string, TranslationKey, 'text' | 'money' | 'date' | 'status'][]; fields: readonly FieldConfig[]; readOnly?: boolean; singleton?: boolean; }
type Row = Record<string, unknown>;
type FormValues = Record<string, string>;

const modulePermissions: Partial<Record<ModuleName, { create: string; edit: string }>> = {
  buildings: { create: 'buildings.create', edit: 'buildings.edit' }, rooms: { create: 'rooms.create', edit: 'rooms.edit' }, tenants: { create: 'tenants.create', edit: 'tenants.edit' },
  contracts: { create: 'contracts.create', edit: 'contracts.edit' }, utilities: { create: 'utilities.create', edit: 'utilities.create' }, payments: { create: 'payments.receive', edit: 'payments.receive' },
  maintenance: { create: 'maintenance.manage', edit: 'maintenance.manage' }, expenses: { create: 'expenses.manage', edit: 'expenses.manage' },
  settings: { create: 'settings.manage', edit: 'settings.manage' },
};

const configs: Record<ModuleName, ModuleConfig> = {
  buildings: { title: 'module.buildings', help: 'module.buildingsHelp', table: 'buildings', select: 'id,code,name,address,floors,is_active', columns: [['code','field.code','text'],['name','field.name','text'],['address','field.address','text'],['floors','field.floors','text'],['is_active','common.status','status']], fields: [{name:'code',label:'field.code',type:'text',required:true},{name:'name',label:'field.name',type:'text',required:true},{name:'address',label:'field.address',type:'text'},{name:'floors',label:'field.floors',type:'number',required:true}] },
  rooms: { title: 'module.rooms', help: 'module.roomsHelp', table: 'rooms', select: 'id,room_number,building_id,floor,monthly_rent,default_deposit,status,contracts(id,start_date,payment_due_day,status,tenants(full_name_lo,full_name_en,phone),invoices(balance,status,due_date,invoice_items(item_type,description,amount)))', columns: [['room_number','field.roomNumber','text'],['monthly_rent','field.monthlyRent','money'],['status','common.status','status']], fields: [{name:'room_number',label:'field.roomNumber',type:'text',required:true},{name:'building_id',label:'field.building',type:'select',required:true,optionSource:'buildings'},{name:'floor',label:'field.floor',type:'number',required:true},{name:'monthly_rent',label:'field.monthlyRent',type:'number',required:true},{name:'default_deposit',label:'field.deposit',type:'number',required:true},{name:'status',label:'common.status',type:'select',required:true,options:['available','reserved','maintenance','disabled']}] },
  tenants: { title: 'module.tenants', help: 'module.tenantsHelp', table: 'tenants', select: 'id,full_name_lo,phone,is_active', columns: [['full_name_lo','field.fullNameLo','text'],['phone','field.phone','text'],['is_active','common.status','status']], fields: [{name:'full_name_lo',label:'field.fullNameLo',type:'text',required:true},{name:'phone',label:'field.phone',type:'text',required:true}] },
  contracts: { title: 'module.contracts', help: 'module.contractsHelp', table: 'contracts', select: 'id,contract_no,tenant_id,room_id,start_date,end_date,monthly_rent,deposit_amount,payment_due_day,electricity_rate,water_rate,status', columns: [['contract_no','field.contractNo','text'],['tenant_id','field.tenant','text'],['room_id','field.room','text'],['start_date','field.startDate','date'],['end_date','field.endDate','date'],['status','common.status','status']], fields: [{name:'contract_no',label:'field.contractNo',type:'text',required:true},{name:'tenant_id',label:'field.tenant',type:'select',required:true,optionSource:'tenants'},{name:'room_id',label:'field.room',type:'select',required:true,optionSource:'rooms'},{name:'start_date',label:'field.startDate',type:'date',required:true},{name:'end_date',label:'field.endDate',type:'date',required:true},{name:'monthly_rent',label:'field.monthlyRent',type:'number',required:true},{name:'deposit_amount',label:'field.deposit',type:'number',required:true},{name:'payment_due_day',label:'field.dueDay',type:'number',required:true},{name:'electricity_rate',label:'field.electricityRate',type:'number',required:true},{name:'water_rate',label:'field.waterRate',type:'number',required:true}] },
  utilities: { title: 'module.utilities', help: 'module.utilitiesHelp', table: 'meter_readings', select: 'id,room_id,meter_type,billing_month,previous_reading,current_reading,units_used,rate,amount', columns: [['room_id','field.room','text'],['meter_type','field.type','text'],['billing_month','field.billingMonth','date'],['previous_reading','field.previousReading','text'],['current_reading','field.currentReading','text'],['units_used','field.units','text'],['amount','common.amount','money']], fields: [{name:'room_id',label:'field.room',type:'select',required:true,optionSource:'rooms'},{name:'meter_type',label:'field.type',type:'select',required:true,options:['electricity','water']},{name:'billing_month',label:'field.billingMonth',type:'month',required:true},{name:'reading_date',label:'common.date',type:'date',required:true},{name:'previous_reading',label:'field.previousReading',type:'number',required:true},{name:'current_reading',label:'field.currentReading',type:'number',required:true},{name:'rate',label:'common.amount',type:'number',required:true}] },
  invoices: { title: 'module.invoices', help: 'module.invoicesHelp', table: 'invoices', select: 'id,invoice_no,billing_month,room_id,tenant_id,due_date,total,paid,balance,status', columns: [['invoice_no','field.invoiceNo','text'],['room_id','field.room','text'],['billing_month','field.billingMonth','date'],['due_date','field.dueDate','date'],['total','field.total','money'],['paid','field.paid','money'],['balance','field.balance','money'],['status','common.status','status']], fields: [], readOnly: true },
  payments: { title: 'module.payments', help: 'module.paymentsHelp', table: 'payments', select: 'id,payment_no,receipt_no,room_id,amount,payment_date,payment_method,notes', columns: [['receipt_no','field.receiptNo','text'],['room_id','field.room','text'],['notes','field.paymentCategory','status'],['amount','common.amount','money'],['payment_date','common.date','date'],['payment_method','field.method','text']], fields: [{name:'room_id',label:'field.room',type:'select',required:true,optionSource:'rooms'},{name:'payment_category',label:'field.paymentCategory',type:'select',required:true,options:['rent','electricity','water','garbage']},{name:'amount',label:'common.amount',type:'number',required:true},{name:'payment_method',label:'field.method',type:'select',required:true,options:['cash','bank_transfer','qr','other']}] },
  maintenance: { title: 'module.maintenance', help: 'module.maintenanceHelp', table: 'maintenance_requests', select: 'id,ticket_no,room_id,issue,category,priority,due_date,cost,status', columns: [['ticket_no','field.code','text'],['room_id','field.room','text'],['issue','field.issue','text'],['category','field.category','text'],['priority','field.priority','status'],['due_date','field.dueDate','date'],['status','common.status','status']], fields: [{name:'ticket_no',label:'field.code',type:'text',required:true},{name:'room_id',label:'field.room',type:'select',optionSource:'rooms'},{name:'issue',label:'field.issue',type:'text',required:true},{name:'category',label:'field.category',type:'text',required:true},{name:'priority',label:'field.priority',type:'select',required:true,options:['low','normal','high','urgent']},{name:'description',label:'field.description',type:'text'},{name:'due_date',label:'field.dueDate',type:'date'},{name:'cost',label:'common.amount',type:'number'},{name:'status',label:'common.status',type:'select',options:['open','assigned','in_progress','completed','cancelled']}] },
  expenses: { title: 'module.expenses', help: 'module.expensesHelp', table: 'expenses', select: 'id,expense_no,expense_date,category_id,building_id,room_id,description,amount,supplier,payment_method,reference_no', columns: [['expense_no','field.code','text'],['expense_date','common.date','date'],['description','field.description','text'],['supplier','field.supplier','text'],['amount','common.amount','money'],['payment_method','field.method','text']], fields: [{name:'expense_no',label:'field.code',type:'text',required:true},{name:'expense_date',label:'common.date',type:'date',required:true},{name:'category_id',label:'field.category',type:'select',required:true,optionSource:'categories'},{name:'building_id',label:'field.building',type:'select',optionSource:'buildings'},{name:'room_id',label:'field.room',type:'select',optionSource:'rooms'},{name:'description',label:'field.description',type:'text',required:true},{name:'amount',label:'common.amount',type:'number',required:true},{name:'supplier',label:'field.supplier',type:'text'},{name:'payment_method',label:'field.method',type:'select',required:true,options:['cash','bank_transfer','qr','other']},{name:'reference_no',label:'field.code',type:'text'}] },
  reports: { title: 'module.reports', help: 'module.reportsHelp', table: 'invoices', select: 'id,invoice_no,billing_month,total,paid,balance,status', columns: [['billing_month','field.billingMonth','date'],['invoice_no','field.invoiceNo','text'],['total','field.total','money'],['paid','field.paid','money'],['balance','field.balance','money'],['status','common.status','status']], fields: [], readOnly: true },
  users: { title: 'module.users', help: 'module.usersHelp', table: 'profiles', select: 'id,full_name,phone,is_active,created_at', columns: [['full_name','field.name','text'],['phone','field.phone','text'],['is_active','common.status','text'],['created_at','common.date','date']], fields: [], readOnly: true },
  settings: { title: 'module.settings', help: 'module.settingsHelp', table: 'settings', select: 'id,property_name_lo,property_name_en,address_lo,address_en,phone,email,default_rent,default_deposit,electricity_rate,water_rate,default_due_day,late_fee,currency,timezone', columns: [['property_name_lo','field.name','text'],['phone','field.phone','text'],['email','field.email','text'],['currency','common.amount','text'],['timezone','common.date','text']], fields: [{name:'property_name_lo',label:'field.name',type:'text',required:true},{name:'property_name_en',label:'field.fullNameEn',type:'text',required:true},{name:'address_lo',label:'field.address',type:'text'},{name:'address_en',label:'field.address',type:'text'},{name:'phone',label:'field.phone',type:'text'},{name:'email',label:'field.email',type:'email'},{name:'default_rent',label:'field.monthlyRent',type:'number',required:true},{name:'default_deposit',label:'field.deposit',type:'number',required:true},{name:'electricity_rate',label:'field.electricityRate',type:'number',required:true},{name:'water_rate',label:'field.waterRate',type:'number',required:true},{name:'default_due_day',label:'field.dueDay',type:'number',required:true},{name:'late_fee',label:'field.balance',type:'number',required:true}], singleton: true },
};

export function ModulePage({ module }: { module: ModuleName }) {
  const config = configs[module];
  const { language, t } = useI18n();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [defaults, setDefaults] = useState<Row>({});
  const [workflowMode, setWorkflowMode] = useState<'checkin' | 'reserve' | null>(null);
  const openedRequest = useRef('');
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: config.columns[0][0], direction: 'asc' });
  const [page, setPage] = useState(1);
  const [access, setAccess] = useState({ create: false, edit: false });
  const [options, setOptions] = useState<Record<string, { value: string; label: string }[]>>({});
  const [statusFilter, setStatusFilter] = useState('');
  const pageSize = module === 'rooms' ? 16 : 20;
  const editableModule = module === 'buildings' || module === 'rooms' || module === 'tenants' || module === 'contracts' || module === 'utilities' || module === 'maintenance' || module === 'expenses' || module === 'settings';
  const manageable = access.edit && editableModule;
  const canToggle = access.edit && (module === 'buildings' || module === 'rooms' || module === 'tenants');
  const permission = modulePermissions[module];
  const requestedRoomId = searchParams.get('room');

  useEffect(() => {
    const client = supabase;
    if (!client || !permission) return;
    let current = true;
    void Promise.all([
      client.rpc('has_permission', { permission_code: permission.create }),
      client.rpc('has_permission', { permission_code: permission.edit }),
    ]).then(([create, edit]) => { if (current) setAccess({ create: create.data === true, edit: edit.data === true }); });
    return () => { current = false; };
  }, [permission]);

  const loadOptions = useCallback(async () => {
    const client = supabase;
    if (!client) return;
    const relationSources = config.columns.map(([key]) => sourceForKey(key)).filter((source): source is OptionSource => Boolean(source));
    const sources = [...new Set([...config.fields.map((field) => field.optionSource).filter((source): source is OptionSource => Boolean(source)), ...relationSources])];
    const next: Record<string, { value: string; label: string }[]> = {};
    await Promise.all(sources.map(async (source) => {
      const maps = { buildings: ['buildings','id,code,name'], rooms: ['rooms','id,room_number'], tenants: ['tenants','id,tenant_code,full_name_lo,full_name_en,is_active'], contracts: ['contracts','id,contract_no'], invoices: ['invoices','id,invoice_no,balance,status,room_id'], categories: ['expense_categories','id,name_lo,name_en'] } as const;
      const [table, select] = maps[source]; const tableName: string = table; const columns: string = select; const { data } = await client.from(tableName).select(columns).limit(500);
      next[source] = ((data ?? []) as unknown as Row[])
        .filter((row) => (source !== 'tenants' || row.is_active !== false) && (source !== 'invoices' || ((row.status !== 'paid' && row.status !== 'cancelled' && row.status !== 'draft') && (!requestedRoomId || row.room_id === requestedRoomId))))
        .map((row) => ({ value: String(row.id), label: String(row.name ?? row.room_number ?? row.full_name_lo ?? row.contract_no ?? row.invoice_no ?? row.name_lo ?? row.code ?? row.id) }));
    }));
    setOptions(next);
  }, [config, requestedRoomId]);

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    if (!supabase) { setRows([]); setLoading(false); return; }
    const { data, error: requestError } = await supabase.from(config.table).select(config.select).limit(100);
    if (requestError) setError(true); else setRows((data ?? []) as unknown as Row[]);
    setLoading(false);
  }, [config]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); void loadOptions(); }, 0); return () => window.clearTimeout(timer); }, [load, loadOptions]);

  const filtered = useMemo(() => rows.filter((row) => {
    const matchesQuery = JSON.stringify(row).toLowerCase().includes(query.toLowerCase());
    const matchesStatus = !statusFilter || String(row.status) === statusFilter || (typeof row.is_active === 'boolean' && row.is_active === (statusFilter === 'true'));
    return matchesQuery && matchesStatus;
  }).sort((left, right) => {
    const a = displayValue(left[sort.key]).toLocaleLowerCase(); const b = displayValue(right[sort.key]).toLocaleLowerCase();
    return a.localeCompare(b, language === 'lo' ? 'lo' : 'en', { numeric: true }) * (sort.direction === 'asc' ? 1 : -1);
  }), [language, query, rows, sort, statusFilter]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const exportCsv = () => {
    const headers = config.columns.map(([key]) => key);
    const csv = [headers.join(','), ...filtered.map((row) => headers.map((key) => JSON.stringify(row[key] ?? '')).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `${module}.csv`; link.click(); URL.revokeObjectURL(url);
  };
  const openForm = async (row: Row | null = null, initialValues: Row = {}, mode: 'checkin' | 'reserve' | null = null) => {
    await loadOptions(); setEditing(row); setDefaults(initialValues); setWorkflowMode(mode); setOpen(true);
  };

  useEffect(() => {
    const roomId = searchParams.get('room');
    if (!roomId || !access.create || (module !== 'contracts' && module !== 'payments' && module !== 'tenants')) return;
    const rawMode = searchParams.get('mode');
    const mode = rawMode === 'checkin' || rawMode === 'reserve' ? rawMode : null;
    const requestKey = `${module}:${roomId}:${mode ?? ''}:${searchParams.get('tenant') ?? ''}`;
    if (openedRequest.current === requestKey) return;
    openedRequest.current = requestKey;
    const timer = window.setTimeout(() => {
      void (async () => {
        await loadOptions();
        const initialValues: Row = {};
        if (module === 'tenants') {
          initialValues.tenant_code = `TN-${Date.now().toString().slice(-8)}`;
        }
        if (module === 'payments') initialValues.room_id = roomId;
        if (module === 'contracts' && supabase) {
          const [{ data: room }, { data: settings }] = await Promise.all([
            supabase.from('rooms').select('monthly_rent,default_deposit').eq('id', roomId).maybeSingle(),
            supabase.from('settings').select('default_due_day,electricity_rate,water_rate').limit(1).maybeSingle(),
          ]);
          const start = new Date();
          const end = new Date(start);
          end.setFullYear(end.getFullYear() + 1);
          end.setDate(end.getDate() - 1);
          initialValues.room_id = roomId;
          initialValues.tenant_id = searchParams.get('tenant') ?? '';
          initialValues.contract_no = `CT-${Date.now().toString().slice(-10)}`;
          initialValues.start_date = start.toISOString().slice(0, 10);
          initialValues.end_date = end.toISOString().slice(0, 10);
          initialValues.monthly_rent = room?.monthly_rent ?? 0;
          initialValues.deposit_amount = room?.default_deposit ?? 0;
          initialValues.payment_due_day = settings?.default_due_day ?? 5;
          initialValues.electricity_rate = settings?.electricity_rate ?? 0;
          initialValues.water_rate = settings?.water_rate ?? 0;
        }
        setEditing(null);
        setDefaults(initialValues);
        setWorkflowMode(mode);
        setOpen(true);
      })();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [access.create, loadOptions, module, searchParams]);

  const handleDialogOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen && requestedRoomId) {
      openedRequest.current = '';
      setSearchParams({}, { replace: true });
    }
  };

  const handleSaved = async (savedId?: string | null) => {
    await load();
    if (module === 'tenants' && savedId && requestedRoomId) {
      const mode = searchParams.get('mode') === 'reserve' ? 'reserve' : 'checkin';
      void navigate(`/contracts?room=${encodeURIComponent(requestedRoomId)}&tenant=${encodeURIComponent(savedId)}&mode=${mode}`, { replace: true });
    }
  };

  const toggleActive = async (row: Row) => {
    if (!supabase) return;
    if (module === 'rooms' && row.status === 'occupied') { await Swal.fire({ icon: 'warning', title: t('common.cannotDeactivateOccupied'), confirmButtonColor: '#4318ff' }); return; }
    const active = module === 'rooms' ? row.status !== 'disabled' : row.is_active !== false;
    const confirmed = await Swal.fire({ icon: 'question', title: active ? t('common.confirmDeactivate') : t('common.confirmActivate'), showCancelButton: true, confirmButtonText: t('common.confirm'), cancelButtonText: t('common.cancel'), confirmButtonColor: '#4318ff' });
    if (!confirmed.isConfirmed) return;
    const payload = module === 'rooms' ? { status: active ? 'disabled' : 'available' } : { is_active: !active };
    const { error: requestError } = await supabase.from(config.table).update(payload).eq('id', String(row.id));
    if (requestError) { await Swal.fire({ icon: 'error', title: t('common.error'), confirmButtonColor: '#4318ff' }); return; }
    await load();
  };

  const changeSort = (key: string) => setSort((current) => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }));
  const isRowEditable = (row: Row) => manageable && (module !== 'contracts' || row.status === 'draft');

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl md:text-3xl">{t(config.title)}</h1>
          {t(config.help) && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t(config.help)}</p>}
        </div>
        <div className="flex shrink-0 gap-2">
          {module === 'reports' && <Button className="rounded-xl" variant="outline" onClick={exportCsv}><FileDown />CSV</Button>}
          {!config.readOnly && access.create && (!config.singleton || rows.length === 0) && <Button className="rounded-xl" onClick={() => void openForm(null)}><Plus />{t('common.add')}</Button>}
        </div>
      </div>

      {!isSupabaseConfigured && <div className="rounded-2xl border border-amber-200/70 bg-amber-50/90 p-4 dark:border-amber-400/20 dark:bg-amber-400/10"><p className="font-semibold text-amber-900 dark:text-amber-200">{t('setup.title')}</p><p className="mt-1 text-sm text-amber-800 dark:text-amber-300">{t('setup.description')}</p></div>}

      <Card className="overflow-hidden border-0 py-0">
        <CardContent className="p-0">
          <div className="flex gap-2 border-b border-border/70 bg-card/80 p-3 sm:p-4">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} className="h-10 rounded-xl bg-background/70 pl-9 text-sm" placeholder={t('common.search')} />
            </div>
            <Button className="rounded-xl" variant="outline" size="icon-lg" onClick={() => void load()} aria-label={t('common.refresh')}><RefreshCw /></Button>
          </div>
          {(module === 'rooms' || module === 'contracts' || module === 'invoices') && (
            <div className="flex gap-1.5 overflow-x-auto px-1 py-1 scrollbar-thin">
              <button type="button" onClick={() => { setStatusFilter(''); setPage(1); }} className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${!statusFilter ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>{t('common.all')}</button>
              {(module === 'rooms' ? ['available','occupied','reserved','maintenance','disabled'] : module === 'contracts' ? ['draft','active','expiring','expired','terminated'] : ['unpaid','partial','paid','overdue','cancelled']).map((s) => (
                <button key={s} type="button" onClick={() => { setStatusFilter(s === statusFilter ? '' : s); setPage(1); }} className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${statusFilter === s ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>{t(`status.${s}` as TranslationKey)}</button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="grid min-h-48 place-items-center text-muted-foreground sm:min-h-64">
              <LoaderCircle className="size-6 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="grid min-h-48 place-items-center text-center sm:min-h-64">
              <div>
                <p className="font-semibold text-destructive">{t('common.error')}</p>
                <Button variant="outline" className="mt-3 rounded-xl" onClick={() => void load()}>{t('common.refresh')}</Button>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="grid min-h-48 place-items-center px-4 text-center sm:min-h-64">
              <div>
                <p className="font-semibold text-foreground">{t('common.noRecords')}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t('common.noRecordsHelp')}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile card view - compact grid */}
              <div className="grid grid-cols-2 gap-2 p-3 sm:hidden">
                {pageRows.map((row) => module === 'rooms' ? <RoomMobileCard key={String(row.id)} row={row} language={language} t={t} canEdit={manageable} onEdit={() => void openForm(row)} onToggle={() => void toggleActive(row)} onNavigate={(path) => void navigate(path)} /> : (
                  <div key={String(row.id)} className="relative rounded-xl border border-border/60 bg-card p-3 transition active:scale-[0.98]">
                    <div className="mb-2 flex items-start justify-between">
                      <span className="text-lg font-bold text-foreground">{renderCell(row[config.columns[0][0]], config.columns[0][2], language, t, config.columns[0][0], options)}</span>
                      {(isRowEditable(row) || canToggle) && (
                        <div className="flex gap-0.5">
                          {isRowEditable(row) && <Button variant="ghost" size="icon" className="size-7 rounded-lg" onClick={() => void openForm(row)} aria-label={t('common.edit')}><Pencil className="size-3.5" /></Button>}
                          {canToggle && <Button variant="ghost" size="icon" className="size-7 rounded-lg text-muted-foreground hover:text-primary" onClick={() => void toggleActive(row)} aria-label={t('common.edit')}><Power className="size-3.5" /></Button>}
                        </div>
                      )}
                    </div>
                    {config.columns.slice(1).map(([key, label, kind]) => (
                      <div key={key} className="flex items-center justify-between gap-1 py-0.5">
                        <span className="text-[10px] text-muted-foreground">{t(label)}</span>
                        <span className="text-xs font-medium text-foreground">{renderCell(row[key], kind, language, t, key, options)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Desktop table view */}
              <div className="overflow-x-auto hidden sm:block">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      {config.columns.map(([key, label]) => (
                        <TableHead className="h-12 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground lg:px-5" key={key}>
                          <button type="button" onClick={() => changeSort(key)} className="flex items-center gap-1.5 hover:text-foreground">{t(label)}<ArrowUpDown className="size-3.5" /></button>
                        </TableHead>
                      ))}
                      {manageable && <TableHead className="w-24 px-4 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground lg:w-28 lg:px-5">{t('common.actions')}</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageRows.map((row) => (
                      <TableRow className="h-14 border-border/60 hover:bg-primary/[0.035] dark:hover:bg-white/[0.035]" key={String(row.id)}>
                        {config.columns.map(([key, , kind]) => (
                          <TableCell className="px-4 text-foreground lg:px-5" key={key}>{renderCell(row[key], kind, language, t, key, options)}</TableCell>
                        ))}
                        {manageable && (
                          <TableCell className="px-4 lg:px-5">
                            <div className="flex justify-end gap-1">
                              {isRowEditable(row) && <Button variant="ghost" size="icon-sm" className="rounded-lg" onClick={() => void openForm(row)} aria-label={t('common.edit')}><Pencil /></Button>}
                              {canToggle && <Button variant="ghost" size="icon-sm" className="rounded-lg text-muted-foreground hover:text-primary" onClick={() => void toggleActive(row)} aria-label={t(row.is_active === false || row.status === 'disabled' ? 'common.confirmActivate' : 'common.confirmDeactivate')}><Power className="size-4" /></Button>}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between border-t border-border/70 bg-card/80 px-3 py-3 sm:px-4">
                <p className="text-xs text-muted-foreground">{filtered.length} {t('common.records')}</p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="size-8 rounded-lg" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="size-4" /></Button>
                  <span className="px-2 text-xs font-semibold text-foreground">{page}/{pageCount}</span>
                  <Button variant="outline" size="icon" className="size-8 rounded-lg" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}><ChevronRight className="size-4" /></Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {!config.readOnly && <RecordDialog open={open} onOpenChange={handleDialogOpenChange} module={module} config={config} options={options} editing={editing} defaults={defaults} workflowMode={workflowMode} onSaved={handleSaved} />}
    </div>
  );
}

function sourceForKey(key: string): OptionSource | undefined {
  return ({ building_id: 'buildings', room_id: 'rooms', tenant_id: 'tenants', contract_id: 'contracts', invoice_id: 'invoices', category_id: 'categories' } as Record<string, OptionSource>)[key];
}

function displayValue(value: unknown) { return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : '—'; }

function renderCell(value: unknown, kind: 'text' | 'money' | 'date' | 'status', language: 'lo' | 'en', t: (key: TranslationKey) => string, key: string, options: Record<string, { value: string; label: string }[]>) {
  const source = sourceForKey(key);
  if (source) return options[source]?.find((option) => option.value === displayValue(value))?.label ?? displayValue(value);
  if (kind === 'money') return <span className="font-medium tabular-nums">{formatMoney(Number(value ?? 0), language)}</span>;
  if (kind === 'date') return formatDate(displayValue(value));
  if (kind === 'status') { const raw = typeof value === 'boolean' ? (value ? 'active' : 'inactive') : displayValue(value); const key = `status.${raw}` as TranslationKey; return <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-violet-200">{t(key) ?? raw}</span>; }
  return displayValue(value);
}

interface RoomContractView {
  id: string;
  start_date: string;
  payment_due_day: number;
  status: string;
  tenants: { full_name_lo?: string; full_name_en?: string; phone?: string } | { full_name_lo?: string; full_name_en?: string; phone?: string }[] | null;
  invoices: { balance?: number; status?: string; due_date?: string; invoice_items?: { item_type?: string; description?: string; amount?: number }[] | null }[] | null;
}

function RoomMobileCard({ row, language, t, canEdit, onEdit, onToggle, onNavigate }: { row: Row; language: 'lo' | 'en'; t: (key: TranslationKey) => string; canEdit: boolean; onEdit: () => void; onToggle: () => void; onNavigate: (path: string) => void }) {
  const contracts = Array.isArray(row.contracts) ? row.contracts as unknown as RoomContractView[] : [];
  const contract = contracts.find((item) => item.status === 'active' || item.status === 'expiring') ?? contracts.find((item) => item.status === 'draft');
  const tenantRecord = Array.isArray(contract?.tenants) ? contract?.tenants[0] : contract?.tenants;
  const tenantName = language === 'en' ? tenantRecord?.full_name_en || tenantRecord?.full_name_lo : tenantRecord?.full_name_lo || tenantRecord?.full_name_en;
  const invoices = contract?.invoices ?? [];
  const payableInvoices = invoices.filter((invoice) => invoice.status !== 'paid' && invoice.status !== 'cancelled' && invoice.status !== 'draft' && Number(invoice.balance ?? 0) > 0);
  const outstanding = payableInvoices.reduce((sum, invoice) => sum + Number(invoice.balance ?? 0), 0);
  const dueInvoice = [...payableInvoices].filter((invoice) => invoice.due_date).sort((left, right) => String(left.due_date).localeCompare(String(right.due_date)))[0];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = dueInvoice?.due_date ? new Date(`${dueInvoice.due_date}T00:00:00`) : contract ? nextPaymentDueDate(contract.payment_due_day, today) : null;
  const overdueDays = due && due < today ? Math.floor((today.getTime() - due.getTime()) / 86_400_000) : 0;
  const invoiceItems = payableInvoices.flatMap((invoice) => invoice.invoice_items ?? []);
  const utilityAmount = (type: 'electricity' | 'water' | 'garbage') => invoiceItems.reduce((sum, item) => {
    const description = String(item.description ?? '').toLocaleLowerCase();
    const matches = type === 'garbage'
      ? (item.item_type === 'service' || item.item_type === 'other') && /garbage|trash|waste|ຂີ້ເຫຍື້ອ/.test(description)
      : item.item_type === type;
    return matches ? sum + Number(item.amount ?? 0) : sum;
  }, 0);
  const electricity = utilityAmount('electricity');
  const water = utilityAmount('water');
  const garbage = utilityAmount('garbage');
  const roomId = encodeURIComponent(displayValue(row.id));
  const status = displayValue(row.status);
  const moneyClass = (amount: number) => overdueDays > 0 && amount > 0 ? 'font-bold text-destructive' : 'font-semibold text-foreground';
  return <article className={`relative flex min-h-72 flex-col rounded-2xl border bg-card p-3 shadow-sm ${overdueDays > 0 ? 'border-destructive/60 ring-1 ring-destructive/15' : 'border-border/70'}`}>
    <div className="flex items-start justify-between gap-1"><div><p className="text-xl font-bold leading-none text-foreground">{displayValue(row.room_number)}</p><div className="mt-2">{renderCell(row.status, 'status', language, t, 'status', {})}</div></div>{canEdit && <div className="flex"><Button variant="ghost" size="icon" className="size-9 rounded-lg" onClick={onEdit} aria-label={t('common.edit')}><Pencil className="size-4" /></Button><Button variant="ghost" size="icon" className="size-9 rounded-lg text-muted-foreground" onClick={onToggle} aria-label={t('common.deactivate')}><Power className="size-4" /></Button></div>}</div>
    <div className="mt-3 space-y-1.5 text-[11px]">
      <RoomCardLine label={t('room.tenant')} value={tenantName ?? t('room.noTenant')} />
      <RoomCardLine label={t('field.phone')} value={tenantRecord?.phone || '—'} />
      <RoomCardLine label={t('room.checkInDate')} value={contract ? formatDate(contract.start_date) : '—'} icon />
      <div className="flex items-start justify-between gap-1"><span className="text-muted-foreground">{t('room.rentDueDate')}</span><div className="text-right"><p className={overdueDays > 0 ? 'font-bold text-destructive' : 'font-medium text-foreground'}>{due ? formatDate(due) : '—'}</p>{overdueDays > 0 && <p className="mt-0.5 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive">{t('room.overdueDays').replace('{days}', String(overdueDays))}</p>}</div></div>
      <RoomCardLine label={t('room.electricity')} value={electricity > 0 ? formatMoney(electricity, language) : '—'} valueClass={moneyClass(electricity)} />
      <RoomCardLine label={t('room.water')} value={water > 0 ? formatMoney(water, language) : '—'} valueClass={moneyClass(water)} />
      <RoomCardLine label={t('room.garbage')} value={garbage > 0 ? formatMoney(garbage, language) : '—'} valueClass={moneyClass(garbage)} />
      {outstanding > 0 && <RoomCardLine label={t('room.outstanding')} value={formatMoney(outstanding, language)} valueClass="font-bold text-destructive" />}
    </div>
    <div className="mt-auto grid gap-1.5 pt-3">{status === 'occupied' ? <Button type="button" className="min-h-11 rounded-xl px-2 text-[11px]" onClick={() => onNavigate(`/payments?room=${roomId}`)}><Banknote className="size-4" />{t('room.receivePayment')}</Button> : (status === 'available' || status === 'reserved') ? <><Button type="button" className="min-h-11 rounded-xl px-2 text-[11px]" onClick={() => onNavigate(`/contracts?room=${roomId}&mode=checkin`)}><UserPlus className="size-4" />{t('room.addTenant')}</Button>{status === 'available' && <Button type="button" variant="outline" className="min-h-11 rounded-xl px-2 text-[11px]" onClick={() => onNavigate(`/contracts?room=${roomId}&mode=reserve`)}><Bookmark className="size-4" />{t('room.reserve')}</Button>}</> : null}</div>
  </article>;
}

function RoomCardLine({ label, value, valueClass = 'font-semibold text-foreground', icon = false }: { label: string; value: string; valueClass?: string; icon?: boolean }) {
  return <div className="flex items-center justify-between gap-1"><span className="flex items-center gap-1 text-muted-foreground">{icon && <CalendarDays className="size-3" />}{label}</span><span className={`max-w-24 truncate text-right tabular-nums ${valueClass}`}>{value}</span></div>;
}

function nextPaymentDueDate(paymentDueDay: number, today: Date) {
  const safeDay = Math.min(28, Math.max(1, Number(paymentDueDay) || 1));
  const due = new Date(today.getFullYear(), today.getMonth(), safeDay);
  if (due < today) due.setMonth(due.getMonth() + 1);
  return due;
}

function RecordDialog({ open, onOpenChange, module, config, options, editing, defaults, workflowMode, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; module: ModuleName; config: ModuleConfig; options: Record<string, {value:string;label:string}[]>; editing: Row | null; defaults: Row; workflowMode: 'checkin' | 'reserve' | null; onSaved: (savedId?: string | null) => Promise<void> }) {
  const { language, t } = useI18n();
  const { dark } = useTheme();
  const [tenantFiles, setTenantFiles] = useState<File[]>([]);
  const [existingDocuments, setExistingDocuments] = useState<{ id: string; original_name: string }[]>([]);
  const shape = Object.fromEntries(config.fields.map((field) => {
    const base = field.required ? z.string().min(1, t('common.required')) : z.string();
    if (field.type === 'email') return [field.name, base.refine((value) => !value || z.email().safeParse(value).success, t('common.invalidEmail'))];
    if (field.type === 'number') return [field.name, base.refine((value) => {
      if (!value) return !field.required;
      const number = Number(value);
      if (!Number.isFinite(number) || number < 0) return false;
      if ((field.name === 'floor' || field.name === 'floors') && number < 1) return false;
      if ((field.name === 'payment_due_day' || field.name === 'default_due_day') && (number < 1 || number > 28)) return false;
      if (field.name === 'amount' && number <= 0) return false;
      return true;
    }, t('common.invalidNumber'))];
    return [field.name, base];
  }));
  const schema = z.object(shape);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) as Resolver<FormValues> });
  useEffect(() => {
    if (!open) return;
    let active = true;
    const values = Object.fromEntries(config.fields.map((field) => {
      const raw = editing?.[field.name] ?? defaults[field.name];
      const value = field.type === 'month' && typeof raw === 'string' ? raw.slice(0, 7) : raw == null ? '' : displayValue(raw);
      return [field.name, value];
    }));
    reset(values);
    const loadTenantDocuments = async () => {
      await Promise.resolve();
      if (!active) return;
      setTenantFiles([]);
      setExistingDocuments([]);
      if (module !== 'tenants' || typeof editing?.id !== 'string' || !supabase) return;
      const { data } = await supabase.from('tenant_documents').select('id,original_name').eq('tenant_id', editing.id).order('created_at', { ascending: false });
      if (active) setExistingDocuments((data ?? []) as { id: string; original_name: string }[]);
    };
    void loadTenantDocuments();
    return () => { active = false; };
  }, [config.fields, defaults, editing, module, open, reset]);
  const submit = handleSubmit(async (values) => {
    if (!supabase) { await Swal.fire({ icon:'warning', title:t('setup.title'), text:t('setup.description'), confirmButtonColor:'#4318ff', background:dark ? '#111c44' : '#ffffff', color:dark ? '#ffffff' : '#1b2559' }); return; }
    if (module === 'contracts' && values.end_date < values.start_date) {
      await Swal.fire({ icon:'error', title:t('common.error'), text:'End date must be on or after the start date.', confirmButtonColor:'#4318ff', background:dark ? '#111c44' : '#ffffff', color:dark ? '#ffffff' : '#1b2559' });
      return;
    }
    if (module === 'utilities' && Number(values.current_reading) < Number(values.previous_reading)) {
      await Swal.fire({ icon:'error', title:t('common.error'), text:'Current meter reading cannot be lower than the previous reading.', confirmButtonColor:'#4318ff', background:dark ? '#111c44' : '#ffffff', color:dark ? '#ffffff' : '#1b2559' });
      return;
    }
    const payload: Record<string, unknown> = {};
    for (const field of config.fields) payload[field.name] = field.type === 'number' ? Number(values[field.name]) : field.type === 'month' ? `${values[field.name]}-01` : values[field.name] || null;
    if (!editing && module === 'tenants') payload.tenant_code = `TN-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    if (!editing && module === 'contracts') payload.status = 'draft';
    if (!editing && module === 'maintenance') { payload.status = 'open'; payload.cost = 0; }
    const { data: authData } = await supabase.auth.getUser();
    const actorId = authData.user?.id;
    if (!editing && actorId) {
      if (module === 'utilities') payload.recorded_by = actorId;
      if (module === 'buildings' || module === 'rooms' || module === 'tenants' || module === 'contracts' || module === 'maintenance' || module === 'expenses') payload.created_by = actorId;
    }
    let requestError: { message: string } | null = null;
    let createdId: string | null = null;
    if (module === 'payments') {
      const category = values.payment_category;
      const roomId = values.room_id;
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('id,balance,due_date,invoice_items(item_type,description,amount),payments(amount,notes,voided_at)')
        .eq('room_id', roomId)
        .in('status', ['unpaid', 'partial', 'overdue'])
        .order('due_date', { ascending: true });
      if (invoiceError) {
        requestError = invoiceError;
      } else {
        const payableInvoice = ((invoiceData ?? []) as unknown as Array<{
          id: string;
          balance: number;
          invoice_items: Array<{ item_type?: string; description?: string; amount?: number }> | null;
          payments: Array<{ amount?: number; notes?: string; voided_at?: string | null }> | null;
        }>).map((invoice) => {
          const itemTotal = (invoice.invoice_items ?? []).reduce((sum, item) => {
            const description = String(item.description ?? '').toLocaleLowerCase();
            const matches = category === 'garbage'
              ? (item.item_type === 'service' || item.item_type === 'other') && /garbage|trash|waste|ຂີ້ເຫຍື້ອ/.test(description)
              : item.item_type === category;
            return matches ? sum + Number(item.amount ?? 0) : sum;
          }, 0);
          const categoryPaid = (invoice.payments ?? []).reduce((sum, payment) => !payment.voided_at && payment.notes === category ? sum + Number(payment.amount ?? 0) : sum, 0);
          return { invoice, categoryBalance: Math.max(0, Math.min(Number(invoice.balance ?? 0), itemTotal - categoryPaid)) };
        }).find(({ categoryBalance }) => categoryBalance > 0);
        if (!payableInvoice) {
          requestError = { message: t('payment.noPayableCharge') };
        } else if (Number(payload.amount) > payableInvoice.categoryBalance) {
          requestError = { message: t('payment.exceedsCategoryBalance').replace('{amount}', formatMoney(payableInvoice.categoryBalance, language)) };
        } else {
          const stamp = crypto.randomUUID().slice(0, 8).toUpperCase();
          const { error } = await supabase.rpc('receive_payment', { target_invoice_id: payableInvoice.invoice.id, payment_amount: payload.amount, method: payload.payment_method, bank_name: null, payment_reference: null, slip_path: null, payment_notes: category, payment_number: `PAY-${stamp}`, receipt_number: `REC-${stamp}`, request_key: crypto.randomUUID() });
          requestError = error;
        }
      }
    } else if (editing) {
      const { error } = await supabase.from(config.table).update(payload).eq('id', String(editing.id));
      requestError = error;
    } else {
      const { data, error } = await supabase.from(config.table).insert(payload).select('id').single();
      requestError = error;
      createdId = data?.id ? String(data.id) : null;
    }
    if (!requestError && module === 'contracts' && createdId && workflowMode === 'reserve') {
      const { error } = await supabase.from('rooms').update({ status: 'reserved' }).eq('id', String(payload.room_id));
      requestError = error;
    }
    if (!requestError && module === 'contracts' && createdId && workflowMode === 'checkin') {
      const { error } = await supabase.rpc('activate_contract', { target_contract_id: createdId, initial_electricity: 0, initial_water: 0, condition_text: null, note_text: null });
      requestError = error;
    }
    const savedId = createdId ?? (typeof editing?.id === 'string' ? editing.id : null);
    if (!requestError && module === 'tenants' && savedId && tenantFiles.length > 0) {
      for (const file of tenantFiles) {
        if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type) || file.size < 1 || file.size > 10 * 1024 * 1024) {
          requestError = { message: t('field.attachmentsHelp') };
          break;
        }
        const safeName = file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'document';
        const storagePath = `${savedId}/${crypto.randomUUID()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from('tenant-documents').upload(storagePath, file, { contentType: file.type, upsert: false });
        if (uploadError) {
          requestError = uploadError;
          break;
        }
        const { error: documentError } = await supabase.from('tenant_documents').insert({
          tenant_id: savedId,
          document_type: 'other',
          storage_path: storagePath,
          original_name: file.name,
          mime_type: file.type,
          file_size: file.size,
          created_by: actorId ?? null,
        });
        if (documentError) {
          requestError = documentError;
          break;
        }
      }
    }
    if (requestError) { await Swal.fire({ icon:'error', title:t('common.error'), text:requestError.message, confirmButtonColor:'#4318ff', background:dark ? '#111c44' : '#ffffff', color:dark ? '#ffffff' : '#1b2559' }); return; }
    await Swal.fire({ icon:'success', title:t('common.saved'), timer:1200, showConfirmButton:false, background:dark ? '#111c44' : '#ffffff', color:dark ? '#ffffff' : '#1b2559' }); reset(); setTenantFiles([]); onOpenChange(false); await onSaved(savedId);
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border-0 p-5 shadow-2xl ring-1 ring-border sm:max-w-xl sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-foreground sm:text-xl">{editing ? t('common.edit') : t('common.add')} {t(config.title)}</DialogTitle>
          <DialogDescription>{t(config.help)}</DialogDescription>
        </DialogHeader>
        <form id={`form-${module}`} className="grid gap-4 py-2 sm:grid-cols-2" onSubmit={submit}>
          {config.fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label className="font-semibold text-foreground" htmlFor={`${module}-${field.name}`}>{t(field.label)}</Label>
              {field.type === 'select' ? (
                <select id={`${module}-${field.name}`} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" {...register(field.name)}>
                  <option value="">—</option>
                  {field.options?.map((value) => <option key={value} value={value}>{t(`${field.name === 'payment_category' ? 'room' : 'status'}.${value}` as TranslationKey) || value}</option>)}
                  {field.optionSource && options[field.optionSource]?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              ) : (
                <Input id={`${module}-${field.name}`} type={field.type} min={field.type === 'number' ? (field.name === 'floor' || field.name === 'floors' || field.name === 'payment_due_day' || field.name === 'default_due_day' || field.name === 'amount' ? 1 : 0) : undefined} max={field.name === 'payment_due_day' || field.name === 'default_due_day' ? 28 : undefined} step={field.type === 'number' ? 'any' : undefined} className="h-10" {...register(field.name)} />
              )}
              {errors[field.name] && <p className="text-xs text-destructive">{String(errors[field.name]?.message)}</p>}
            </div>
          ))}
          {module === 'tenants' && <div className="space-y-2 sm:col-span-2">
            <Label className="font-semibold text-foreground" htmlFor="tenant-attachments">{t('field.attachments')}</Label>
            <Input id="tenant-attachments" type="file" multiple accept="image/jpeg,image/png,application/pdf" className="h-auto min-h-11 cursor-pointer py-2 file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:font-semibold file:text-primary" onChange={(event) => setTenantFiles(Array.from(event.target.files ?? []))} />
            <p className="text-xs text-muted-foreground">{t('field.attachmentsHelp')}</p>
            {(existingDocuments.length > 0 || tenantFiles.length > 0) && <div className="rounded-xl bg-muted/60 px-3 py-2 text-xs text-foreground">
              {existingDocuments.map((document) => <p key={document.id} className="truncate">• {document.original_name}</p>)}
              {tenantFiles.map((file) => <p key={`${file.name}-${file.lastModified}`} className="truncate font-semibold text-primary">+ {file.name}</p>)}
            </div>}
          </div>}
        </form>
        <DialogFooter className="-mx-5 -mb-5 rounded-b-2xl border-t border-border/70 bg-card/80 px-5 py-3 sm:-mx-6 sm:-mb-6 sm:rounded-b-2xl sm:px-6">
          <Button className="rounded-xl" variant="outline" type="button" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button className="rounded-xl" type="submit" form={`form-${module}`} disabled={isSubmitting}>{isSubmitting && <LoaderCircle className="animate-spin" />}{t('common.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
