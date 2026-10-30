# Vendelia

Local deals marketplace for the Helsinki region (Helsinki, Espoo, Vantaa, Kauniainen). Finnish first, with Swedish and English.

```
frontend/   Next.js 16 + React + TypeScript — customer site, business portal, admin
backend/    Node.js + Fastify — Supabase-backed catalogue and cart quotes
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

## Checks
```bash
npm run typecheck
npm test
npm run build
```

## Status
- **Frontend** (production URL https://www.vendelia.fi): customer, business and admin screens, Finnish / Swedish / English.
  Catalogue data comes exclusively from the API. Outages show an error rather than hardcoded partner data.
- **Backend:** database health, catalogue metadata/list/detail, and server-priced cart quotes are implemented.
  Sign-in, merchant/admin writes, orders, payments and vouchers still need their API implementations.
  Remaining contract: [docs/api/endpoints.md](docs/api/endpoints.md).
- **Deploy:** the Vercel project builds `frontend/` (root directory `frontend`, install from the repo root). Set `BACKEND_URL` there once an API is deployed.
