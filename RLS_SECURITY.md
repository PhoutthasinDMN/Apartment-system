# RLS and security

RLS is enabled on every application table. `public.has_permission()` resolves the signed-in profile's role without trusting the client. Read access requires `data.view`; mutations require module-specific permissions.

Payments are created through `receive_payment`, which locks the invoice, checks its payable state and balance, honors a unique idempotency key, inserts the payment, and recalculates invoice totals in one transaction. Payment and deposit history cannot be directly deleted through exposed policies. Audit logs are insert-only through database triggers and readable only with `audit.view`.

All storage buckets are private. Policies restrict reads to signed-in users with data access and writes to the relevant module permission. File size and MIME allow-lists are set at bucket level; the client must still validate files before upload.

The anonymous key is safe to expose only because RLS remains enabled. Never add the service-role key to `.env`, frontend code, logs, or deployment variables accessible to the browser.
