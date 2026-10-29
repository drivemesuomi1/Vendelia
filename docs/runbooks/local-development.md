# Local development

Requirements: Node.js 20.11+ (22 recommended). No database install needed.

```bash
npm install
npm run dev          # API on :4000 and web on :3000 together
```

Open http://localhost:3000 (redirects to `/fi`).

- First start creates an embedded Postgres (PGlite) in `backend/.data/pglite`, runs migrations and adds the launch cities,
  categories and commission rate. **No sample merchants or deals** are created — the catalogue starts empty.
- Demo logins (dev only, password = `DEMO_PASSWORD` in `backend/.env.example`):
  `admin@vendelia.test` (admin) and `asiakas@vendelia.test` (customer).
- To get deals: sign up a business at `/fi/register/business`, approve it in **Admin → Businesses**, create a deal in the
  business portal, then approve the deal in **Admin → Deal review**.
- Tests use their own fictional merchants and deals (`backend/tests/fixtures/`); the app never loads them.
- Emails are not sent; they are stored in the `email_outbox` table and shown in **Admin → Support**.
- Payments use the mock provider: checkout shows a short simulated bank step, then issues vouchers.

## Reset the database
Stop the API and delete `backend/.data/`. The next start recreates and reseeds it.

## Use a real Postgres
```bash
docker compose -f infra/docker-compose.yml up -d
```
Set `DATABASE_URL=postgres://vendelia:vendelia@localhost:5432/vendelia` in `backend/.env`.

## Change the database schema
Edit `backend/src/db/schema/*`, then `npm run db:generate` to create a migration in `backend/src/db/migrations/`. Migrations run automatically on API start.

## Checks
```bash
npm run typecheck
npm test             # backend unit + integration (in-memory DB), frontend unit
npm run build
```
