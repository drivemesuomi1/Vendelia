# Vendelia

Local deals marketplace for the Helsinki region (Helsinki, Espoo, Vantaa, Kauniainen). Finnish first, with Swedish and English.

```
frontend/   Next.js 16 + React + TypeScript — customer site, business portal, admin
backend/    Node.js + Fastify — minimal placeholder; the team is writing the real API (see backend/README.md)
shared/     Zod schemas and TypeScript types used by both
docs/       Architecture decisions, domain rules, API reference, runbooks
infra/      Docker Compose for a local Postgres
```

## Quick start
```bash
npm install
npm run dev
```
Open http://localhost:3000. The catalogue starts empty (no sample deals). Details, demo logins and database options: [docs/runbooks/local-development.md](docs/runbooks/local-development.md).

## Checks
```bash
npm run typecheck
npm test
npm run build
```

## Status
- **Frontend** (live at https://vendelia.vercel.app): all customer, business and admin screens, Finnish / Swedish / English.
  Without an API it shows the launch cities and categories with an empty catalogue; sign-in, checkout and the portals need the backend.
- **Backend:** placeholder with `GET /api/health`. Contract to implement: [docs/api/endpoints.md](docs/api/endpoints.md).
  A complete reference implementation (Fastify + Drizzle + Postgres, money/VAT/commission rules, vouchers, refunds, ledger, payouts, tests)
  is on the `backend-reference` branch.
- **Deploy:** the Vercel project builds `frontend/` (root directory `frontend`, install from the repo root). Set `BACKEND_URL` there once an API is deployed.
