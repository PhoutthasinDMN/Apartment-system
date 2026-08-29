begin;

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create type public.room_status as enum ('available','occupied','reserved','maintenance','disabled');
create type public.contract_status as enum ('draft','active','expiring','expired','terminated');
create type public.invoice_status as enum ('draft','unpaid','partial','paid','overdue','cancelled');
create type public.payment_method as enum ('cash','bank_transfer','qr','other');
create type public.deposit_transaction_type as enum ('received','deduction','refund','adjustment');
create type public.maintenance_priority as enum ('low','normal','high','urgent');
create type public.maintenance_status as enum ('open','assigned','in_progress','completed','cancelled');

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z_]+$'),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text not null,
  created_at timestamptz not null default now()
);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role_id uuid not null references public.roles(id),
  full_name text not null,
  phone text,
  avatar_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.buildings (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  address text,
  floors integer not null default 1 check (floors > 0),
  description text,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.room_types (
  id uuid primary key default gen_random_uuid(),
  name_lo text not null,
  name_en text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  room_number text not null,
  building_id uuid not null references public.buildings(id),
  floor integer not null check (floor > 0),
  room_type_id uuid references public.room_types(id),
  monthly_rent numeric(18,2) not null default 0 check (monthly_rent >= 0),
  default_deposit numeric(18,2) not null default 0 check (default_deposit >= 0),
  electricity_meter_no text,
  water_meter_no text,
  status public.room_status not null default 'available',
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (building_id, room_number)
);
create index rooms_status_idx on public.rooms(status);
create index rooms_building_floor_idx on public.rooms(building_id, floor);

create table public.room_images (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  storage_path text not null,
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  tenant_code text not null unique,
  full_name_lo text not null,
  full_name_en text,
  gender text check (gender is null or gender in ('male','female','other')),
  date_of_birth date,
  phone text not null,
  whatsapp text,
  email text,
  identity_number text,
  address text,
  emergency_contact text,
  emergency_phone text,
  notes text,
  profile_photo_path text,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tenants_name_lo_idx on public.tenants using gin (to_tsvector('simple', full_name_lo));
create index tenants_phone_idx on public.tenants(phone);

create table public.tenant_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  document_type text not null check (document_type in ('id_card','passport','other')),
  storage_path text not null,
  original_name text not null,
  mime_type text not null,
  file_size bigint not null check (file_size between 1 and 10485760),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  contract_no text not null unique,
  tenant_id uuid not null references public.tenants(id),
  room_id uuid not null references public.rooms(id),
  start_date date not null,
  end_date date not null,
  monthly_rent numeric(18,2) not null check (monthly_rent >= 0),
  deposit_amount numeric(18,2) not null default 0 check (deposit_amount >= 0),
  payment_due_day integer not null check (payment_due_day between 1 and 28),
  electricity_rate numeric(18,4) not null default 0 check (electricity_rate >= 0),
  water_rate numeric(18,4) not null default 0 check (water_rate >= 0),
  terms text,
  notes text,
  contract_file_path text,
  status public.contract_status not null default 'draft',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);
create unique index one_current_contract_per_room_idx on public.contracts(room_id) where status in ('active','expiring');
create index contracts_tenant_idx on public.contracts(tenant_id);
create index contracts_end_date_idx on public.contracts(end_date) where status in ('active','expiring');

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null unique references public.contracts(id),
  check_in_at timestamptz not null default now(),
  electricity_initial numeric(18,3) not null default 0 check (electricity_initial >= 0),
  water_initial numeric(18,3) not null default 0 check (water_initial >= 0),
  keys jsonb not null default '[]'::jsonb,
  furniture jsonb not null default '[]'::jsonb,
  equipment jsonb not null default '[]'::jsonb,
  room_condition text,
  image_paths text[] not null default '{}',
  notes text,
  completed_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.meter_readings (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id),
  contract_id uuid references public.contracts(id),
  meter_type text not null check (meter_type in ('electricity','water')),
  billing_month date not null check (billing_month = date_trunc('month', billing_month)::date),
  reading_date date not null,
  previous_reading numeric(18,3) not null check (previous_reading >= 0),
  current_reading numeric(18,3) not null check (current_reading >= 0),
  units_used numeric(18,3) generated always as (current_reading - previous_reading) stored,
  rate numeric(18,4) not null check (rate >= 0),
  amount numeric(18,2) generated always as (round((current_reading - previous_reading) * rate, 2)) stored,
  is_meter_reset boolean not null default false,
  reset_reason text,
  recorded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(room_id, meter_type, billing_month),
  check (current_reading >= previous_reading or (is_meter_reset and reset_reason is not null))
);
create index meter_room_date_idx on public.meter_readings(room_id, meter_type, reading_date desc);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_no text not null unique,
  billing_month date not null check (billing_month = date_trunc('month', billing_month)::date),
  contract_id uuid not null references public.contracts(id),
  tenant_id uuid not null references public.tenants(id),
  room_id uuid not null references public.rooms(id),
  issue_date date not null,
  due_date date not null,
  subtotal numeric(18,2) not null default 0 check (subtotal >= 0),
  discount numeric(18,2) not null default 0 check (discount >= 0),
  late_fee numeric(18,2) not null default 0 check (late_fee >= 0),
  total numeric(18,2) not null default 0 check (total >= 0),
  paid numeric(18,2) not null default 0 check (paid >= 0),
  balance numeric(18,2) not null default 0 check (balance >= 0),
  status public.invoice_status not null default 'draft',
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles(id),
  cancel_reason text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (due_date >= issue_date),
  check (discount <= subtotal + late_fee)
);
create unique index invoice_room_month_unique_idx on public.invoices(room_id, billing_month) where status <> 'cancelled';
create index invoices_status_due_idx on public.invoices(status, due_date);
create index invoices_tenant_idx on public.invoices(tenant_id);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  item_type text not null check (item_type in ('rent','electricity','water','internet','parking','service','other')),
  description text not null,
  quantity numeric(18,3) not null default 1 check (quantity >= 0),
  unit_price numeric(18,4) not null default 0 check (unit_price >= 0),
  amount numeric(18,2) generated always as (round(quantity * unit_price, 2)) stored,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index invoice_items_invoice_idx on public.invoice_items(invoice_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  payment_no text not null unique,
  receipt_no text not null unique,
  invoice_id uuid not null references public.invoices(id),
  tenant_id uuid not null references public.tenants(id),
  room_id uuid not null references public.rooms(id),
  amount numeric(18,2) not null check (amount > 0),
  payment_date timestamptz not null default now(),
  payment_method public.payment_method not null,
  bank text,
  reference_no text,
  payment_slip_path text,
  notes text,
  idempotency_key uuid not null unique,
  received_by uuid not null references public.profiles(id),
  voided_at timestamptz,
  voided_by uuid references public.profiles(id),
  void_reason text,
  created_at timestamptz not null default now()
);
create index payments_invoice_idx on public.payments(invoice_id) where voided_at is null;
create index payments_date_idx on public.payments(payment_date desc);

create table public.deposit_transactions (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id),
  transaction_type public.deposit_transaction_type not null,
  amount numeric(18,2) not null check (amount > 0),
  transaction_date timestamptz not null default now(),
  description text not null,
  reference_no text,
  created_by uuid not null references public.profiles(id),
  reversed_at timestamptz,
  reversed_by uuid references public.profiles(id),
  reversal_reason text,
  created_at timestamptz not null default now()
);
create index deposit_contract_date_idx on public.deposit_transactions(contract_id, transaction_date);

create table public.check_outs (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null unique references public.contracts(id),
  check_out_at timestamptz not null default now(),
  final_electricity numeric(18,3) not null check (final_electricity >= 0),
  final_water numeric(18,3) not null check (final_water >= 0),
  room_condition text,
  damage_amount numeric(18,2) not null default 0 check (damage_amount >= 0),
  other_deduction numeric(18,2) not null default 0 check (other_deduction >= 0),
  outstanding_amount numeric(18,2) not null default 0 check (outstanding_amount >= 0),
  refund_amount numeric(18,2) not null default 0 check (refund_amount >= 0),
  notes text,
  completed_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  ticket_no text not null unique,
  room_id uuid references public.rooms(id),
  issue text not null,
  category text not null,
  priority public.maintenance_priority not null default 'normal',
  description text,
  reported_date timestamptz not null default now(),
  assigned_to uuid references public.profiles(id),
  due_date date,
  cost numeric(18,2) not null default 0 check (cost >= 0),
  status public.maintenance_status not null default 'open',
  notes text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index maintenance_status_due_idx on public.maintenance_requests(status, due_date);

create table public.maintenance_images (
  id uuid primary key default gen_random_uuid(),
  maintenance_id uuid not null references public.maintenance_requests(id) on delete cascade,
  image_stage text not null check (image_stage in ('before','after')),
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  name_lo text not null,
  name_en text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  expense_no text not null unique,
  expense_date date not null,
  category_id uuid not null references public.expense_categories(id),
  description text not null,
  amount numeric(18,2) not null check (amount > 0),
  supplier text,
  building_id uuid references public.buildings(id),
  room_id uuid references public.rooms(id),
  payment_method public.payment_method not null,
  reference_no text,
  attachment_path text,
  notes text,
  created_by uuid not null references public.profiles(id),
  voided_at timestamptz,
  voided_by uuid references public.profiles(id),
  void_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index expenses_date_idx on public.expenses(expense_date desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references public.profiles(id),
  notification_type text not null,
  title_key text not null,
  body_key text not null,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_recipient_idx on public.notifications(recipient_id, read_at, created_at desc);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  action text not null,
  module text not null,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);
create index audit_module_record_idx on public.audit_logs(module, record_id, created_at desc);
create index audit_user_date_idx on public.audit_logs(user_id, created_at desc);

create table public.settings (
  id uuid primary key default gen_random_uuid(),
  property_name_lo text not null default 'ຫໍພັກ',
  property_name_en text not null default 'Residence',
  logo_path text,
  address_lo text,
  address_en text,
  phone text,
  email text,
  currency text not null default 'LAK' check (currency = 'LAK'),
  default_rent numeric(18,2) not null default 0,
  default_deposit numeric(18,2) not null default 0,
  electricity_rate numeric(18,4) not null default 0,
  water_rate numeric(18,4) not null default 0,
  default_due_day integer not null default 5 check (default_due_day between 1 and 28),
  late_fee numeric(18,2) not null default 0,
  tenant_prefix text not null default 'TN',
  contract_prefix text not null default 'CT',
  invoice_prefix text not null default 'INV',
  receipt_prefix text not null default 'REC',
  expense_prefix text not null default 'EXP',
  maintenance_prefix text not null default 'MT',
  invoice_reminder_days integer not null default 3 check (invoice_reminder_days >= 0),
  contract_expiry_warning_days integer not null default 30 check (contract_expiry_warning_days >= 0),
  default_language text not null default 'lo' check (default_language in ('lo','en')),
  date_format text not null default 'dd/MM/yyyy',
  timezone text not null default 'Asia/Vientiane' check (timezone = 'Asia/Vientiane'),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

do $$ declare table_name text; begin
  foreach table_name in array array['profiles','buildings','room_types','rooms','tenants','contracts','meter_readings','invoices','maintenance_requests','expense_categories','expenses','settings'] loop
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end $$;

create function public.has_permission(permission_code text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p
    join role_permissions rp on rp.role_id = p.role_id
    join permissions pe on pe.id = rp.permission_id
    where p.id = auth.uid() and p.is_active and pe.code = permission_code
  );
$$;

create function public.audit_row_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_record_id uuid;
begin
  v_record_id := coalesce((to_jsonb(new)->>'id')::uuid, (to_jsonb(old)->>'id')::uuid);
  insert into audit_logs(user_id, action, module, record_id, old_data, new_data)
  values (auth.uid(), tg_op, tg_table_name, v_record_id, case when tg_op <> 'INSERT' then to_jsonb(old) end, case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return coalesce(new, old);
end; $$;

do $$ declare table_name text; begin
  foreach table_name in array array['buildings','rooms','tenants','contracts','meter_readings','invoices','payments','deposit_transactions','check_outs','maintenance_requests','expenses','settings','profiles','role_permissions'] loop
    execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function public.audit_row_change()', table_name, table_name);
  end loop;
end $$;

create function public.recalculate_invoice(target_invoice_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_subtotal numeric(18,2); v_paid numeric(18,2); v_invoice invoices%rowtype;
begin
  select * into v_invoice from invoices where id = target_invoice_id for update;
  if not found then return; end if;
  select coalesce(sum(amount),0) into v_subtotal from invoice_items where invoice_id = target_invoice_id;
  select coalesce(sum(amount),0) into v_paid from payments where invoice_id = target_invoice_id and voided_at is null;
  update invoices set
    subtotal = v_subtotal,
    total = greatest(v_subtotal - discount + late_fee, 0),
    paid = least(v_paid, greatest(v_subtotal - discount + late_fee, 0)),
    balance = greatest(v_subtotal - discount + late_fee - v_paid, 0),
    status = case
      when status = 'cancelled' then 'cancelled'::invoice_status
      when v_paid >= greatest(v_subtotal - discount + late_fee, 0) and greatest(v_subtotal - discount + late_fee, 0) > 0 then 'paid'::invoice_status
      when v_paid > 0 then 'partial'::invoice_status
      when due_date < current_date then 'overdue'::invoice_status
      when status = 'draft' then 'draft'::invoice_status
      else 'unpaid'::invoice_status end
  where id = target_invoice_id;
end; $$;

create function public.invoice_item_changed() returns trigger language plpgsql as $$
begin perform public.recalculate_invoice(coalesce(new.invoice_id, old.invoice_id)); return coalesce(new, old); end; $$;
create trigger recalc_invoice_items after insert or update or delete on public.invoice_items for each row execute function public.invoice_item_changed();

create function public.validate_invoice_header() returns trigger language plpgsql as $$
begin
  new.total := greatest(new.subtotal - new.discount + new.late_fee, 0);
  new.paid := least(new.paid, new.total);
  new.balance := greatest(new.total - new.paid, 0);
  if new.status <> 'cancelled' then
    new.status := case when new.paid >= new.total and new.total > 0 then 'paid'::invoice_status when new.paid > 0 then 'partial'::invoice_status when new.status = 'draft' then 'draft'::invoice_status when new.due_date < current_date then 'overdue'::invoice_status else 'unpaid'::invoice_status end;
  end if;
  return new;
end; $$;
create trigger validate_invoice_header before insert or update of subtotal,discount,late_fee,paid,due_date on public.invoices for each row execute function public.validate_invoice_header();

create function public.receive_payment(
  target_invoice_id uuid, payment_amount numeric, method public.payment_method,
  bank_name text, payment_reference text, slip_path text, payment_notes text,
  payment_number text, receipt_number text, request_key uuid
) returns public.payments
language plpgsql security definer set search_path = public as $$
declare v_invoice invoices%rowtype; v_payment payments%rowtype;
begin
  if not has_permission('payments.receive') then raise exception 'not_authorized'; end if;
  if payment_amount <= 0 then raise exception 'invalid_payment_amount'; end if;
  select * into v_payment from payments where idempotency_key = request_key;
  if found then return v_payment; end if;
  select * into v_invoice from invoices where id = target_invoice_id for update;
  if not found or v_invoice.status in ('draft','cancelled','paid') then raise exception 'invoice_not_payable'; end if;
  if payment_amount > v_invoice.balance then raise exception 'payment_exceeds_balance'; end if;
  insert into payments(payment_no, receipt_no, invoice_id, tenant_id, room_id, amount, payment_method, bank, reference_no, payment_slip_path, notes, idempotency_key, received_by)
  values(payment_number, receipt_number, v_invoice.id, v_invoice.tenant_id, v_invoice.room_id, payment_amount, method, bank_name, payment_reference, slip_path, payment_notes, request_key, auth.uid()) returning * into v_payment;
  perform recalculate_invoice(v_invoice.id);
  return v_payment;
end; $$;

create function public.activate_contract(target_contract_id uuid, initial_electricity numeric, initial_water numeric, condition_text text, note_text text) returns public.contracts
language plpgsql security definer set search_path = public as $$
declare v_contract contracts%rowtype;
begin
  if not has_permission('contracts.approve') then raise exception 'not_authorized'; end if;
  select * into v_contract from contracts where id = target_contract_id for update;
  if not found or v_contract.status <> 'draft' then raise exception 'contract_not_draft'; end if;
  if exists(select 1 from contracts where room_id = v_contract.room_id and id <> v_contract.id and status in ('active','expiring')) then raise exception 'room_has_active_contract'; end if;
  update contracts set status = 'active' where id = v_contract.id returning * into v_contract;
  update rooms set status = 'occupied' where id = v_contract.room_id;
  insert into check_ins(contract_id, electricity_initial, water_initial, room_condition, notes, completed_by)
  values(v_contract.id, initial_electricity, initial_water, condition_text, note_text, auth.uid());
  if v_contract.deposit_amount > 0 then
    insert into deposit_transactions(contract_id, transaction_type, amount, description, created_by)
    values(v_contract.id, 'received', v_contract.deposit_amount, 'Initial deposit', auth.uid());
  end if;
  return v_contract;
end; $$;

create function public.complete_checkout(
  target_contract_id uuid, final_electricity_value numeric, final_water_value numeric,
  condition_text text, damage_value numeric, other_deduction_value numeric, checkout_notes text
) returns public.check_outs
language plpgsql security definer set search_path = public as $$
declare v_contract contracts%rowtype; v_deposit numeric(18,2); v_outstanding numeric(18,2); v_refund numeric(18,2); v_checkout check_outs%rowtype;
begin
  if not has_permission('contracts.terminate') then raise exception 'not_authorized'; end if;
  select * into v_contract from contracts where id = target_contract_id for update;
  if not found or v_contract.status not in ('active','expiring','expired') then raise exception 'contract_not_active'; end if;
  select coalesce(sum(case transaction_type when 'received' then amount when 'adjustment' then amount else -amount end),0) into v_deposit from deposit_transactions where contract_id = v_contract.id and reversed_at is null;
  select coalesce(sum(balance),0) into v_outstanding from invoices where contract_id = v_contract.id and status not in ('paid','cancelled','draft');
  v_refund := greatest(v_deposit - v_outstanding - damage_value - other_deduction_value, 0);
  insert into check_outs(contract_id, final_electricity, final_water, room_condition, damage_amount, other_deduction, outstanding_amount, refund_amount, notes, completed_by)
  values(v_contract.id, final_electricity_value, final_water_value, condition_text, damage_value, other_deduction_value, v_outstanding, v_refund, checkout_notes, auth.uid()) returning * into v_checkout;
  if damage_value + other_deduction_value > 0 then insert into deposit_transactions(contract_id, transaction_type, amount, description, created_by) values(v_contract.id, 'deduction', damage_value + other_deduction_value, 'Check-out deductions', auth.uid()); end if;
  if v_refund > 0 then insert into deposit_transactions(contract_id, transaction_type, amount, description, created_by) values(v_contract.id, 'refund', v_refund, 'Check-out refund', auth.uid()); end if;
  update contracts set status = 'terminated' where id = v_contract.id;
  update rooms set status = 'available' where id = v_contract.room_id;
  return v_checkout;
end; $$;

insert into roles(code,name) values
('super_admin','Super Administrator'),('admin','Administrator'),('manager','Manager'),('cashier','Cashier'),('staff','Staff'),('viewer','Viewer');

insert into permissions(code,description) values
('data.view','View operational data'),('buildings.create','Create buildings'),('buildings.edit','Edit buildings'),('rooms.create','Create rooms'),('rooms.edit','Edit rooms'),
('tenants.create','Create tenants'),('tenants.edit','Edit tenants'),('contracts.create','Create contracts'),('contracts.edit','Edit contracts'),('contracts.approve','Activate contracts'),('contracts.terminate','Complete check-out'),
('utilities.create','Record meter readings'),('invoices.create','Create invoices'),('invoices.cancel','Cancel invoices'),('payments.receive','Receive payments'),('payments.refund','Refund or void payments'),
('maintenance.manage','Manage maintenance'),('expenses.manage','Manage expenses'),('reports.financial','View financial reports'),('users.manage','Manage users and permissions'),('settings.manage','Manage settings'),('audit.view','View audit logs');

insert into role_permissions(role_id,permission_id)
select r.id,p.id from roles r cross join permissions p where r.code in ('super_admin','admin');
insert into role_permissions(role_id,permission_id)
select r.id,p.id from roles r cross join permissions p where r.code='manager' and p.code not in ('users.manage','settings.manage');
insert into role_permissions(role_id,permission_id)
select r.id,p.id from roles r cross join permissions p where r.code='cashier' and p.code in ('data.view','payments.receive','invoices.create','tenants.create','tenants.edit');
insert into role_permissions(role_id,permission_id)
select r.id,p.id from roles r cross join permissions p where r.code='staff' and p.code in ('data.view','rooms.edit','tenants.create','tenants.edit','utilities.create','maintenance.manage');
insert into role_permissions(role_id,permission_id)
select r.id,p.id from roles r cross join permissions p where r.code='viewer' and p.code='data.view';

insert into settings default values;

alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.profiles enable row level security;
alter table public.buildings enable row level security;
alter table public.room_types enable row level security;
alter table public.rooms enable row level security;
alter table public.room_images enable row level security;
alter table public.tenants enable row level security;
alter table public.tenant_documents enable row level security;
alter table public.contracts enable row level security;
alter table public.check_ins enable row level security;
alter table public.meter_readings enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;
alter table public.deposit_transactions enable row level security;
alter table public.check_outs enable row level security;
alter table public.maintenance_requests enable row level security;
alter table public.maintenance_images enable row level security;
alter table public.expense_categories enable row level security;
alter table public.expenses enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.settings enable row level security;

create policy authenticated_read_roles on roles for select to authenticated using (true);
create policy authenticated_read_permissions on permissions for select to authenticated using (true);
create policy managers_read_role_permissions on role_permissions for select to authenticated using (has_permission('users.manage'));
create policy manage_role_permissions on role_permissions for all to authenticated using (has_permission('users.manage')) with check (has_permission('users.manage'));
create policy read_profiles on profiles for select to authenticated using (has_permission('data.view') or id = auth.uid());
create policy manage_profiles on profiles for all to authenticated using (has_permission('users.manage')) with check (has_permission('users.manage'));

do $$ declare table_name text; begin
  foreach table_name in array array['buildings','room_types','rooms','room_images','tenants','tenant_documents','contracts','check_ins','meter_readings','invoices','invoice_items','payments','deposit_transactions','check_outs','maintenance_requests','maintenance_images','expense_categories','expenses','settings'] loop
    execute format('create policy read_%I on public.%I for select to authenticated using (public.has_permission(''data.view''))', table_name, table_name);
  end loop;
end $$;

create policy manage_buildings on buildings for all to authenticated using (has_permission('buildings.edit')) with check (has_permission('buildings.create') or has_permission('buildings.edit'));
create policy manage_room_types on room_types for all to authenticated using (has_permission('rooms.edit')) with check (has_permission('rooms.edit'));
create policy manage_rooms on rooms for all to authenticated using (has_permission('rooms.edit')) with check (has_permission('rooms.create') or has_permission('rooms.edit'));
create policy manage_room_images on room_images for all to authenticated using (has_permission('rooms.edit')) with check (has_permission('rooms.edit'));
create policy manage_tenants on tenants for all to authenticated using (has_permission('tenants.edit')) with check (has_permission('tenants.create') or has_permission('tenants.edit'));
create policy manage_tenant_documents on tenant_documents for all to authenticated using (has_permission('tenants.edit')) with check (has_permission('tenants.edit'));
create policy manage_contracts on contracts for all to authenticated using (has_permission('contracts.edit')) with check (has_permission('contracts.create') or has_permission('contracts.edit'));
create policy manage_check_ins on check_ins for insert to authenticated with check (has_permission('contracts.approve'));
create policy manage_meter_readings on meter_readings for all to authenticated using (has_permission('utilities.create')) with check (has_permission('utilities.create'));
create policy insert_invoices on invoices for insert to authenticated with check (has_permission('invoices.create'));
create policy update_invoices on invoices for update to authenticated using (has_permission('invoices.create') or has_permission('invoices.cancel')) with check (has_permission('invoices.create') or has_permission('invoices.cancel'));
create policy insert_invoice_items on invoice_items for insert to authenticated with check (has_permission('invoices.create') and exists(select 1 from invoices where id=invoice_id and status='draft'));
create policy update_invoice_items on invoice_items for update to authenticated using (has_permission('invoices.create') and exists(select 1 from invoices where id=invoice_id and status='draft')) with check (has_permission('invoices.create') and exists(select 1 from invoices where id=invoice_id and status='draft'));
create policy delete_invoice_items on invoice_items for delete to authenticated using (has_permission('invoices.create') and exists(select 1 from invoices where id=invoice_id and status='draft'));
create policy manage_maintenance on maintenance_requests for all to authenticated using (has_permission('maintenance.manage')) with check (has_permission('maintenance.manage'));
create policy manage_maintenance_images on maintenance_images for all to authenticated using (has_permission('maintenance.manage')) with check (has_permission('maintenance.manage'));
create policy manage_expense_categories on expense_categories for all to authenticated using (has_permission('expenses.manage')) with check (has_permission('expenses.manage'));
create policy insert_expenses on expenses for insert to authenticated with check (has_permission('expenses.manage'));
create policy update_expenses on expenses for update to authenticated using (has_permission('expenses.manage')) with check (has_permission('expenses.manage'));
create policy own_notifications on notifications for select to authenticated using (recipient_id is null or recipient_id = auth.uid());
create policy mark_own_notifications on notifications for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
create policy audit_read on audit_logs for select to authenticated using (has_permission('audit.view'));
create policy settings_manage on settings for update to authenticated using (has_permission('settings.manage')) with check (has_permission('settings.manage'));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('room-images','room-images',false,10485760,array['image/jpeg','image/png','image/webp']),
('tenant-documents','tenant-documents',false,10485760,array['image/jpeg','image/png','application/pdf']),
('contract-files','contract-files',false,10485760,array['application/pdf','image/jpeg','image/png']),
('payment-slips','payment-slips',false,10485760,array['image/jpeg','image/png','application/pdf']),
('maintenance-images','maintenance-images',false,10485760,array['image/jpeg','image/png','image/webp']),
('expense-attachments','expense-attachments',false,10485760,array['image/jpeg','image/png','application/pdf']),
('property-assets','property-assets',false,5242880,array['image/jpeg','image/png','image/webp','image/svg+xml'])
on conflict (id) do nothing;

create policy storage_read_authenticated on storage.objects for select to authenticated using (bucket_id in ('room-images','tenant-documents','contract-files','payment-slips','maintenance-images','expense-attachments','property-assets') and has_permission('data.view'));
create policy storage_room_write on storage.objects for insert to authenticated with check (bucket_id='room-images' and has_permission('rooms.edit'));
create policy storage_tenant_write on storage.objects for insert to authenticated with check (bucket_id='tenant-documents' and has_permission('tenants.edit'));
create policy storage_contract_write on storage.objects for insert to authenticated with check (bucket_id='contract-files' and has_permission('contracts.edit'));
create policy storage_payment_write on storage.objects for insert to authenticated with check (bucket_id='payment-slips' and has_permission('payments.receive'));
create policy storage_maintenance_write on storage.objects for insert to authenticated with check (bucket_id='maintenance-images' and has_permission('maintenance.manage'));
create policy storage_expense_write on storage.objects for insert to authenticated with check (bucket_id='expense-attachments' and has_permission('expenses.manage'));
create policy storage_property_write on storage.objects for insert to authenticated with check (bucket_id='property-assets' and has_permission('settings.manage'));

grant execute on function public.has_permission(text) to authenticated;
grant execute on function public.receive_payment(uuid,numeric,public.payment_method,text,text,text,text,text,text,uuid) to authenticated;
grant execute on function public.activate_contract(uuid,numeric,numeric,text,text) to authenticated;
grant execute on function public.complete_checkout(uuid,numeric,numeric,text,numeric,numeric,text) to authenticated;

commit;
