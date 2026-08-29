-- Operational defaults required by the CRUD forms.
begin;

insert into expense_categories (name_lo, name_en)
select seed.name_lo, seed.name_en
from (values
  ('ຄ່າໄຟຟ້າ', 'Electricity'),
  ('ຄ່ານ້ຳ', 'Water'),
  ('ສ້ອມແປງ', 'Repairs and maintenance'),
  ('ອຸປະກອນ', 'Equipment and supplies'),
  ('ຄ່າບໍລິຫານ', 'Administration'),
  ('ອື່ນໆ', 'Other')
) as seed(name_lo, name_en)
where not exists (
  select 1 from expense_categories existing
  where lower(existing.name_en) = lower(seed.name_en)
);

update settings
set property_name_lo = 'Apartment Management System By Mino V1',
    property_name_en = 'Apartment Management System By Mino V1',
    updated_at = now()
where id = (select id from settings order by created_at limit 1);

commit;
