-- Promote an admin account that was created through Supabase Auth.
-- The login page maps the short username "admin" to admin@mino.local.
-- No password is stored in this migration and auth.users is never modified directly.
begin;

DO $$
DECLARE admin_user_id uuid; super_admin_role_id uuid;
BEGIN
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@mino.local';
  SELECT id INTO super_admin_role_id FROM roles WHERE code = 'super_admin';
  IF super_admin_role_id IS NULL THEN SELECT id INTO super_admin_role_id FROM roles WHERE code = 'admin'; END IF;
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Create admin@mino.local in Supabase Authentication before running this migration';
  END IF;
  IF super_admin_role_id IS NULL THEN
    RAISE EXCEPTION 'Neither super_admin nor admin role exists';
  END IF;

  UPDATE profiles
  SET role_id = super_admin_role_id,
      full_name = 'Administrator',
      is_active = true,
      updated_at = now()
  WHERE id = admin_user_id;
END $$;

commit;
