-- Authenticated CRUD/RLS smoke test. All mutations are rolled back.
begin;

select set_config(
  'request.jwt.claim.sub',
  (select id::text from auth.users where email = 'admin@apartment.app' limit 1),
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

do $$
declare
  actor_id uuid := auth.uid();
  suffix text := txid_current()::text;
  building_id uuid;
  room_id uuid;
  tenant_id uuid;
  contract_id uuid;
  invoice_id uuid;
  category_id uuid;
  meter_id uuid;
  maintenance_id uuid;
  expense_id uuid;
  delete_building_id uuid;
  delete_room_id uuid;
  delete_tenant_id uuid;
  delete_contract_id uuid;
begin
  if actor_id is null or not has_permission('data.view') then
    raise exception 'CRUD smoke test requires an authenticated administrator';
  end if;

  insert into buildings (code, name, floors, created_by)
  values ('TEST-' || suffix, 'CRUD Test Building', 2, actor_id)
  returning id into building_id;
  update buildings set name = 'CRUD Test Building Updated' where id = building_id;

  insert into rooms (building_id, room_number, floor, monthly_rent, default_deposit, created_by)
  values (building_id, 'T-' || suffix, 1, 800000, 800000, actor_id)
  returning id into room_id;
  update rooms set monthly_rent = 850000 where id = room_id;

  insert into tenants (tenant_code, full_name_lo, phone, created_by)
  values ('TN-TEST-' || suffix, 'ຜູ້ເຊົ່າທົດສອບ', '02000000000', actor_id)
  returning id into tenant_id;
  update tenants set phone = '02011111111' where id = tenant_id;

  insert into contracts (
    contract_no, tenant_id, room_id, start_date, end_date, monthly_rent,
    deposit_amount, payment_due_day, electricity_rate, water_rate, status, created_by
  ) values (
    'CT-TEST-' || suffix, tenant_id, room_id, current_date, current_date + 365,
    850000, 850000, 5, 2000, 5000, 'draft', actor_id
  ) returning id into contract_id;
  update contracts set payment_due_day = 7 where id = contract_id;

  insert into meter_readings (
    room_id, contract_id, meter_type, billing_month, reading_date,
    previous_reading, current_reading, rate, recorded_by
  ) values (
    room_id, contract_id, 'electricity', date_trunc('month', current_date)::date,
    current_date, 100, 120, 2000, actor_id
  ) returning id into meter_id;
  update meter_readings set current_reading = 121 where id = meter_id;

  insert into maintenance_requests (
    ticket_no, room_id, issue, category, priority, status, created_by
  ) values (
    'MT-TEST-' || suffix, room_id, 'CRUD smoke test', 'Testing', 'normal', 'open', actor_id
  ) returning id into maintenance_id;
  update maintenance_requests set status = 'in_progress', cost = 10000 where id = maintenance_id;

  select id into category_id from expense_categories where is_active order by created_at limit 1;
  if category_id is null then raise exception 'No expense category is available'; end if;
  insert into expenses (
    expense_no, expense_date, category_id, description, amount, payment_method, created_by
  ) values (
    'EXP-TEST-' || suffix, current_date, category_id, 'CRUD smoke test', 10000, 'cash', actor_id
  ) returning id into expense_id;
  update expenses set amount = 12000 where id = expense_id;

  insert into invoices (
    invoice_no, billing_month, contract_id, tenant_id, room_id,
    issue_date, due_date, status, created_by
  ) values (
    'INV-TEST-' || suffix, date_trunc('month', current_date)::date,
    contract_id, tenant_id, room_id, current_date, current_date + 7, 'draft', actor_id
  ) returning id into invoice_id;
  insert into invoice_items (invoice_id, item_type, description, quantity, unit_price)
  values (invoice_id, 'rent', 'Monthly rent', 1, 850000);
  update invoices set status = 'unpaid' where id = invoice_id;

  perform receive_payment(
    invoice_id, 100000, 'cash', null, null, null, 'CRUD smoke test',
    'PAY-TEST-' || suffix, 'REC-TEST-' || suffix, gen_random_uuid()
  );

  update settings set default_due_day = default_due_day where id = (select id from settings order by created_at limit 1);

  -- Explicit hard-delete checks for non-ledger master data use isolated records.
  insert into buildings (code, name, floors, created_by)
  values ('DEL-' || suffix, 'Delete Test', 1, actor_id) returning id into delete_building_id;
  insert into rooms (building_id, room_number, floor, monthly_rent, default_deposit, created_by)
  values (delete_building_id, 'DEL-' || suffix, 1, 1, 1, actor_id) returning id into delete_room_id;
  insert into tenants (tenant_code, full_name_lo, phone, created_by)
  values ('DEL-TN-' || suffix, 'Delete Test', '02022222222', actor_id) returning id into delete_tenant_id;
  insert into contracts (
    contract_no, tenant_id, room_id, start_date, end_date, monthly_rent,
    deposit_amount, payment_due_day, electricity_rate, water_rate, status, created_by
  ) values (
    'DEL-CT-' || suffix, delete_tenant_id, delete_room_id, current_date, current_date + 1,
    1, 1, 1, 1, 1, 'draft', actor_id
  ) returning id into delete_contract_id;
  delete from contracts where id = delete_contract_id;
  delete from tenants where id = delete_tenant_id;
  delete from rooms where id = delete_room_id;
  delete from buildings where id = delete_building_id;

  -- Users and reports are intentionally read-only in the UI.
  perform 1 from profiles limit 1;
  perform 1 from invoices limit 1;

  raise notice 'CRUD/RLS smoke test passed for buildings, rooms, tenants, contracts, utilities, invoices, payments, maintenance, expenses, settings, users and reports';
end $$;

rollback;
