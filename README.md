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
For the shared customer/business/admin profile migration and account setup, see
[user accounts](docs/accounts.md). Login uses Supabase Auth plus profile roles;
apply migrations 002/003 and configure the Auth variables before testing.

## Docker / Hostinger VPS deployment

The root `Dockerfile` packages the complete application as one non-root Next.js
standalone service, including the embedded Fastify API. Supabase remains external.
Build from the repository root. For local Docker Compose, copy
`.env.docker.example` to `.env.docker`, configure it, then run
`docker compose up --build -d` (loopback port 3001). For Dokploy use Dockerfile
Application mode and container port 3000. See the
[Hostinger/Dokploy runbook](docs/runbooks/hostinger-dokploy.md) for exact settings,
runtime secrets, HTTPS testing and domain cutover. No CI workflow or automatic
database migration is added.

## Public preview notice

A shared `PreviewBanner` at the top of the locale root layout identifies the site
as under development and not yet open for purchases. It appears on customer,
authentication and portal pages, with an equivalent notice in the global error
fallback. Wording is translated in `frontend/messages/{fi,sv,en}.json` under
`previewBanner`; styling is in `frontend/src/components/layout/PreviewBanner.css`.
The notice is not dismissible and is rendered without client-side state. It is
informational: payment/test-checkout controls remain governed by backend settings.
No database migration or new environment variable is required.

## Homepage banner

The homepage uses a static, rounded services card in
`frontend/src/features/deals/components/PromoBanner.tsx`, inside a slightly wider
hero wrapper (1320px maximum; other page sections keep their existing width). It displays the brand, localized headline and Browse deals button,
plus `/banner/home-services.webp` with database-backed category labels/links.
There are no rotating slides, autoplay timers, progress bars or carousel controls.
Responsive styles are in the Home banner section of `frontend/src/styles/globals.css`.
Deals below the banner continue loading from the database. No database or environment
changes are needed for this presentation change.

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
  real payments remain unimplemented; merchant-authorized redemption is implemented.
  Merchant login, membership and the owned-deal list are database-backed; apply
  migration 005 and follow [merchant login setup](docs/merchant-login.md). Deal
  creation/editing, admin review, merchant redemption and admin voucher views
  are implemented; admin finance screens still include demo data. See
  [voucher workflow](docs/voucher-redemption.md).
  General/admin login and email-owned customer vouchers are implemented. Public registration
  remains separate work. Admin Add business can optionally provision a linked
  Auth account; apply 005/006 and follow [account provisioning](docs/merchant-account-provisioning.md).
  Admin business creation/list/detail/status are database-backed;
  apply migration 004. See [admin business setup](docs/admin-businesses.md).
  Remaining contract: [docs/api/endpoints.md](docs/api/endpoints.md).
- **Deploy:** the Vercel project builds `frontend/` (root directory `frontend`, install from the repo root).
  Set server-side `DATABASE_URL` in Vercel and leave `BACKEND_URL` unset: the existing Fastify API runs inside Next.js.
  A separately hosted API remains optional through `BACKEND_URL`. See [deployment setup](docs/database-catalogue.md#deployment).
