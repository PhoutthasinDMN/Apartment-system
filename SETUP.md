# Setup

## Supabase

Create a Supabase project in a region suitable for Laos, then run the migrations in filename order. Authentication should have email/password enabled. Add the deployed application URL and local `http://localhost:3000` URL to the Authentication redirect allow-list.

Copy `.env.example` to `.env`:

```env
VITE_SUPABASE_URL=https://PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

Never place the service-role key in this file or in browser code.

## First administrator

Create the first account in Supabase Authentication. Then run this once, replacing the email:

```sql
update public.profiles p
set role_id = (select id from public.roles where code = 'super_admin')
from auth.users u
where p.id = u.id and u.email = 'owner@example.com';
```

The database trigger automatically creates a viewer profile for every later Auth user. An administrator can then assign the appropriate role.

## Development data

Run `supabase/seed.sql` only against a non-production project. It adds two buildings, twenty rooms, room types, and expense categories. It does not create Auth users.
