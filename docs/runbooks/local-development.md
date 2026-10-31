# Local development

Requirements: Node.js 20.11+ (22 recommended).

```bash
npm install
# Copy backend/.env.example to backend/.env and configure Supabase DATABASE_URL.
npm run dev          # Supabase-backed API on :4000 and web on :3000 together
```

Open http://localhost:3000 (redirects to `/fi`).

The backend now serves the catalogue and cart quotes from Supabase. Run
`npm run db:check -w backend` to verify current database rows through the API.
There are no hardcoded deal or reference-data fallbacks; an unreachable backend
shows a retry screen. Guest test checkout and vouchers are implemented; see
[voucher setup](../voucher-flow.md). Login requires the profile/session migrations and Auth environment settings in
[account setup](../accounts.md). Public registration, real payments and merchant/admin
database writes remain separate API work. See [database catalogue setup](../database-catalogue.md).

## After pulling changes

1. Run `npm install` from the repo root when package files change, then restart the
   development server. Missing `nodemailer` or `pdf-lib` after pulling the voucher
   feature indicates dependencies have not been installed in this checkout.
2. Review `.env.example` changes and configure local values without committing secrets.
   Vercel environment variables must be updated separately, followed by a redeploy.
3. Review `backend/sql/migrations/` and coordinate with the database owner before
   applying changes to shared Supabase. Code pulls and builds do not apply SQL.
   See [database changes and team workflow](../database-changes.md).

## Checks
```bash
npm run typecheck
npm test
npm run build
```

## Deploying the frontend (Vercel)
The Vercel project `vendelia` uses framework Next.js, root directory `frontend`,
"include source files outside root" on, and install command `cd .. && npm ci`.
Set DATABASE_URL in Vercel to the Supabase pooler URI and leave BACKEND_URL unset.
The Next.js Node API route hosts the existing Fastify app in that deployment;
no separate backend host is required. Redeploy after updating environment variables.
See [deployment setup](../database-catalogue.md#deployment) for the optional external API mode.
