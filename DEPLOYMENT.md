# Deployment

1. Create a dedicated production Supabase project.
2. Run both migrations, create the first administrator, and configure Auth redirect URLs.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the deployment environment.
4. Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.
5. Deploy the generated application with the configured environment variables.

After deployment, verify login, role restrictions, private file access, payment idempotency, partial payment status, receipt printing, contract activation, check-out settlement, language switching, and mobile navigation before entering production data.

Back up PostgreSQL and Storage independently. Test restoration regularly. Treat migration files as append-only once deployed.
