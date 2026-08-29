-- Development/testing only. Never run this file against production.
begin;

insert into room_types(id,name_lo,name_en,description) values
('10000000-0000-0000-0000-000000000001','ຫ້ອງມາດຕະຖານ','Standard','Standard studio room'),
('10000000-0000-0000-0000-000000000002','ຫ້ອງໃຫຍ່','Large','Large room with balcony') on conflict do nothing;

insert into buildings(id,code,name,address,floors) values
('20000000-0000-0000-0000-000000000001','BLD-A','ອາຄານ A','Vientiane',3),
('20000000-0000-0000-0000-000000000002','BLD-B','ອາຄານ B','Vientiane',2) on conflict do nothing;

insert into rooms(room_number,building_id,floor,room_type_id,monthly_rent,default_deposit,status)
select lpad(n::text,3,'0'), case when n <= 12 then '20000000-0000-0000-0000-000000000001'::uuid else '20000000-0000-0000-0000-000000000002'::uuid end,
case when n <= 6 then 1 when n <= 12 then 2 when n <= 16 then 1 else 2 end,
case when n % 4 = 0 then '10000000-0000-0000-0000-000000000002'::uuid else '10000000-0000-0000-0000-000000000001'::uuid end,
case when n % 4 = 0 then 2200000 else 1500000 end, 1500000,
case when n in (5,17) then 'maintenance'::room_status else 'available'::room_status end
from generate_series(1,20) n on conflict do nothing;

insert into expense_categories(name_lo,name_en) values
('ຄ່າສ້ອມແປງ','Maintenance'),('ຄ່ານ້ຳ-ໄຟສ່ວນລວມ','Common utilities'),('ອຸປະກອນ','Supplies') on conflict do nothing;

commit;
