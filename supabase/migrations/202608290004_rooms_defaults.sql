-- Seed the first 16 rooms without weakening the rooms table constraints.
-- Re-running this migration updates the standard room prices but preserves occupancy.
begin;

insert into buildings (code, name, address, floors)
values ('MINO', 'Apartment Management System By Mino V1', null, 2)
on conflict (code) do update
set name = excluded.name,
    floors = excluded.floors,
    updated_at = now();

-- Repair any rows created while these fields were temporarily nullable.
update rooms
set building_id = (select id from buildings where code = 'MINO')
where building_id is null;

update rooms
set floor = 1
where floor is null or floor < 1;

alter table rooms alter column building_id set not null;
alter table rooms alter column floor set not null;

with target_building as (
  select id from buildings where code = 'MINO'
), room_seed as (
  select
    lpad(room_no::text, 2, '0') as room_number,
    case when room_no <= 8 then 1 else 2 end as floor
  from generate_series(1, 16) as room_no
)
insert into rooms (
  building_id,
  room_number,
  floor,
  monthly_rent,
  default_deposit,
  status,
  notes
)
select
  target_building.id,
  room_seed.room_number,
  room_seed.floor,
  800000,
  800000,
  'available'::public.room_status,
  null
from target_building
cross join room_seed
on conflict (building_id, room_number) do update
set floor = excluded.floor,
    monthly_rent = excluded.monthly_rent,
    default_deposit = excluded.default_deposit,
    updated_at = now();

commit;
