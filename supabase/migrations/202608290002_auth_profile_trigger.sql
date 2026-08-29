begin;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare default_role uuid;
begin
  select id into default_role from roles where code = 'viewer';
  insert into profiles(id, role_id, full_name)
  values(new.id, default_role, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

commit;
