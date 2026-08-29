# Apartment Management System

A Lao-first, bilingual rental room and apartment management application built with Vite/Vinext, React, TypeScript, Tailwind CSS, Supabase, React Router, React Hook Form, Zod, SweetAlert2, Lucide, Recharts, and date-fns.

## Quick start

1. Install Node.js 22.13 or newer and run `npm install`.
2. Copy `.env.example` to `.env` and add the Supabase project URL and anonymous key.
3. In Supabase SQL Editor, run `supabase/migrations/202608290001_initial_schema.sql`, then `supabase/migrations/202608290002_auth_profile_trigger.sql`.
4. Create the first user in Supabase Authentication and promote it using the SQL in [SETUP.md](SETUP.md).
5. Run `npm run dev`.

## Commands

- `npm run dev` — local development
- `npm run typecheck` — TypeScript validation
- `npm run lint` — lint checks
- `npm test` — unit tests
- `npm run build` — production build

Seed data is intentionally separate in `supabase/seed.sql`; use it only in a development project.

## Security

The browser receives only the Supabase anonymous key. Authorization is enforced by RLS and permission-aware database functions. Financial records use cancel, void, reverse, or transactional RPC workflows instead of hard deletion. See [RLS_SECURITY.md](RLS_SECURITY.md).
