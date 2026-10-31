# Vendelia

Local deals marketplace for the Helsinki region (Helsinki, Espoo, Vantaa, Kauniainen). Finnish first, with Swedish and English.

```
frontend/   Next.js 16 + React + TypeScript — customer site, business portal, admin
backend/    Node.js + Fastify — catalogue, cart quotes, test orders and vouchers
shared/     Zod schemas and TypeScript types used by both
docs/       Architecture decisions, domain rules, API reference, runbooks
infra/      Docker Compose for a local Postgres
```

## Quick start
```bash
npm install
# Configure backend/.env using backend/.env.example (Supabase DATABASE_URL).
npm run dev
```
Open http://localhost:3000. Cities, categories, merchants, deals and prices load from the configured database.
See [catalogue setup and verification](docs/database-catalogue.md) and [local development](docs/runbooks/local-development.md).
After pulling dependency changes, run `npm install` again and restart the development server.
Database changes are applied separately; pulling code or deploying does not run migrations.
See [database changes and team workflow](docs/database-changes.md) and [voucher setup](docs/voucher-flow.md).

## Checks
```bash
npm run typecheck
npm test
npm run build
```

## Status
- **Frontend** (production URL https://www.vendelia.fi): customer, business and admin screens, Finnish / Swedish / English.
  Catalogue data comes exclusively from the API. Outages show an error rather than hardcoded partner data.
- **Backend:** database health, catalogue metadata/list/detail, server-priced cart quotes,
  guest test orders, voucher PDFs/email and public voucher lookup are implemented.
  Checkout requires migration `001_orders_vouchers.sql` and explicit payment bypass configuration;
  real payments and merchant-authorized redemption are not implemented.
  Business accounts/submissions/approvals use a browser demo store; admin orders/finance use sample data.
  Sign-in and merchant/admin database writes remain separate work.
  Remaining contract: [docs/api/endpoints.md](docs/api/endpoints.md).
- **Deploy:** the Vercel project builds `frontend/` (root directory `frontend`, install from the repo root).
  Set server-side `DATABASE_URL` in Vercel and leave `BACKEND_URL` unset: the existing Fastify API runs inside Next.js.
  A separately hosted API remains optional through `BACKEND_URL`. See [deployment setup](docs/database-catalogue.md#deployment).
