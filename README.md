# Vendelia

Local deals marketplace for the Helsinki region (Helsinki, Espoo, Vantaa, Kauniainen). Finnish first, with Swedish and English.

```
frontend/   Next.js 16 + React + TypeScript — customer site, business portal, admin
backend/    Node.js + Fastify + Drizzle + Postgres — API, money rules, jobs
shared/     Zod schemas and TypeScript types used by both
docs/       Architecture decisions, domain rules, API reference, runbooks
infra/      Docker Compose for a local Postgres
prototype/  Original HTML prototype (design reference; served by the Vercel project)
```

## Quick start
```bash
npm install
npm run dev
```
Open http://localhost:3000. Details, demo accounts and database options: [docs/runbooks/local-development.md](docs/runbooks/local-development.md).

## Checks
```bash
npm run typecheck
npm test
npm run build
```

## Status
Working end to end with a **mock payment provider**: browse, cart, checkout (bank / MobilePay / card UI), vouchers, 14-day cancellation,
merchant sign-up, deal creation with live payout preview, admin approval, redemption, payout statements and runs, emails (outbox).
Not done yet: real payment provider (Stripe Connect), real email sending, scannable QR codes, image CDN, production deployment of the API.
