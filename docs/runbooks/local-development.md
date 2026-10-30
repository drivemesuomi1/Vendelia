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
shows a retry screen. Sign-in, checkout and merchant/admin writes remain separate
API work. See [database catalogue setup](../database-catalogue.md).

## Checks
```bash
npm run typecheck
npm test
npm run build
```

## Deploying the frontend (Vercel)
The Vercel project `vendelia` uses framework Next.js, root directory `frontend`,
"include source files outside root" on, and install command `cd .. && npm ci`.
Deploy the Fastify API separately and set BACKEND_URL in Vercel to its HTTPS origin
before rebuilding the frontend. Browsers use the same-origin /api rewrite; server
components fetch that API directly. DATABASE_URL belongs only on the backend host.
