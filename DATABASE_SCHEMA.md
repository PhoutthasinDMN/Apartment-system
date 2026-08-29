# Database schema

The schema is normalized around the rental lifecycle:

- Property: `buildings`, `room_types`, `rooms`, `room_images`
- People and access: `profiles`, `roles`, `permissions`, `role_permissions`, `tenants`, `tenant_documents`
- Occupancy: `contracts`, `check_ins`, `check_outs`
- Utilities: `meter_readings`
- Billing: `invoices`, `invoice_items`, `payments`, `deposit_transactions`
- Operations: `maintenance_requests`, `maintenance_images`, `expense_categories`, `expenses`
- System: `notifications`, `audit_logs`, `settings`

Important integrity rules include a partial unique index preventing more than one current contract per room, a unique active invoice per room/month, a unique payment idempotency key, generated meter units/amounts, generated invoice item amounts, and update/audit triggers.

`receive_payment`, `activate_contract`, and `complete_checkout` are `security definer` transactional RPCs that verify the caller's permission before changing related records.
