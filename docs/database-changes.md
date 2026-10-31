# Database changes and team workflow

## Current scope

The database owner manages shared Supabase changes. Frontend/backend commits do
not automatically change Supabase: neither development startup nor Vercel builds
run the migration command.

The owner's schema exports reviewed on 2026-10-31 contained these seven tables:
`cities`, `categories`, `merchants`, `deals`, `deal_options`, `deal_cities`, and
`deal_option_price_history`. The UUID primary keys on `deals`, `deal_options` and
`merchants` match the references required by migration 001.

| Migration | Adds | Existing catalogue changes |
| --- | --- | --- |
| `backend/sql/migrations/001_orders_vouchers.sql` | `orders`, `order_items`, `vouchers`, constraints, indexes and access restrictions | None |
| `backend/sql/migrations/002_profiles.sql` | Shared `profiles` for customer/merchant/admin roles, linked to existing Supabase `auth.users`, with RLS and access restrictions | None |
| `backend/sql/migrations/003_auth_sessions.sql` | Hashed, revocable, eight-hour website sessions referencing profiles | None |

The exports were taken before migration 001. This document records compatibility
and code requirements, not a live deployment ledger. Verify each target database
after applying SQL; local, test and production environments can differ.

Shared profile setup and account-provisioning SQL are documented in
[user accounts](accounts.md). The owner confirmed the earlier admin-only SQL was
not applied; the unapplied migration was replaced with `002_profiles.sql`. Migration 002 requires Supabase Auth's
`auth.users` table, which plain local Postgres fixtures do not provide. This is a
prerequisite for login. Apply 003 as well: the admin and general login forms now
use Supabase Auth and profile roles, with database-backed website sessions.

## Purchase relationships

- Every new table has an auto-generated UUID `id` primary key.
- `orders.number` and `vouchers.code` are unique.
- `order_items.order_id` references `orders.id`; `deal_id` and `option_id` reference
  the existing catalogue tables.
- `vouchers` references its order, order item, deal, option and merchant.
- Deleting an order cascades to its items and vouchers. Deleting an order item
  cascades to its vouchers. Avoid deleting real purchase records.
- Referenced catalogue deals, options and merchants are protected by `ON DELETE RESTRICT`.
- Prices remain integer EUR cents; VAT rates remain integer basis points.
- RLS is enabled on all three new tables and grants are revoked from `anon` and
  `authenticated`. The backend uses its server-side database role; browser clients
  should use the implemented API rather than access these purchase tables directly.

Foreign keys validate that referenced rows exist. They do not, by themselves,
enforce every cross-table rule (such as an option belonging to the supplied deal);
the backend validates checkout pairs and constructs the related records.

## Applying migration 001

Choose one method, targeting the intended Supabase project:

1. Supabase SQL Editor: paste the entire migration file between `BEGIN;` and
   `COMMIT;`, then run it as one query.
2. From the repo root: configure `backend/.env` with the intended `DATABASE_URL`,
   install dependencies with `npm install`, then run `npm run db:migrate -w backend`.

The runner executes all `.sql` files in filename order, each in a transaction.
It currently has no migration-history table and reruns files on every invocation.
Migration 001 uses `IF NOT EXISTS`, which skips existing tables without validating
or updating their columns. Do not use this behavior to reconcile schema drift.

Check the resulting tables and RLS flags in SQL Editor:

```sql
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN ('orders', 'order_items', 'vouchers')
ORDER BY c.relname;
```

Expect three rows, each with `rls_enabled = true`. Then configure the restricted
test checkout and email settings in [voucher setup](voucher-flow.md), and place a
test order. Verify saved records without exposing buyer details or access tokens:

```sql
SELECT o.number, o.status, o.is_test, o.total_cents, o.email_status,
  (SELECT count(*) FROM public.order_items oi WHERE oi.order_id = o.id) AS item_lines,
  (SELECT count(*) FROM public.vouchers v WHERE v.order_id = o.id) AS voucher_count
FROM public.orders o
ORDER BY o.created_at DESC
LIMIT 10;
```

One line with quantity two produces two vouchers. With payment bypass enabled,
expect `test_unpaid` and `is_test = true`. Verify the emailed/downloaded PDF and QR
origin as well. Merchant redemption returns 501 until merchant authentication exists.

## Team change procedure

1. Describe each schema change in a new numbered file under `backend/sql/migrations/`.
   Once a migration is shared/applied, add a new migration rather than silently
   editing the old one. Account for the runner's current replay behavior, or add
   migration tracking before introducing migrations that cannot safely be rerun.
2. Coordinate application to shared Supabase with the database owner. Record the
   target environment, migration filename, application date and verification in
   the PR or team handoff. Never include database credentials or customer records.
3. Keep SQL, backend writes/reads, shared validation/types and relevant test fixtures
   consistent. The runtime currently uses raw SQL; a diagram is not an applied schema.
4. Document any new environment variables in `.env.example` and the feature guide.
   Install changed dependencies locally; update Vercel variables and redeploy separately.
5. Verify against a dedicated test database before shared deployment. Never point
   fixture-creation tests at the production database.

Shared profiles now have a migration with `customer`, `merchant` and `admin` roles.
Login is connected to Supabase Auth and profiles; public registration remains pending.
Merchant membership, authorized redemption and real payments remain later work.
Business portal localStorage and admin sample data are not Supabase
records. The large `docs/domain/database.dbml` is a future design, not a migration
or a description of every table currently deployed.
