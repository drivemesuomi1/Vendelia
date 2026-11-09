# Hostinger VPS deployment with Docker and Dokploy

## Architecture

One production Node.js container serves the Next.js customer site, admin/business
portals and embedded Fastify API. Supabase Database, Auth and Storage remain
external. Keep `BACKEND_URL` empty. No database migration is run during build or
startup, and no PostgreSQL container is required for production.

- Root `Dockerfile`: Node 24 Debian slim, cached npm workspace dependency stage,
  production build stage, non-root runtime containing Next's traced standalone
  server plus public/static assets. No compiler/dev server or npm start is needed
  in the runtime image.
- `frontend/next.config.ts`: `VENDELIA_STANDALONE=true` enables standalone output
  during Docker builds. Normal local/Vercel build output remains unchanged.
- `.dockerignore`: excludes local .env files, dependency/build folders, Git,
  agent/AWS directories and known local credential notes. Never add secrets to
  Docker build arguments or copy a real .env into an image.
- `.env.example`: runtime environment template; actual `.env` is
  ignored by Git and Docker. It is not created/populated automatically.
- Root `compose.yaml`: optional local/manual run of this same single service.
  The old `infra/docker-compose.yml` remains a separate development PostgreSQL
  fixture, not a production app deployment.

## Local build and run

Run from the repository root:

```sh
cp .env.example .env
# Edit .env with the target Supabase/SMTP/origin settings.
docker compose up --build -d
docker compose ps
docker compose logs --tail=100 web
curl --fail http://127.0.0.1:3001/api/health/live
curl --fail http://127.0.0.1:3001/api/health
```

`docker compose down` stops this application. It does not delete Supabase data.
Compose publishes only `127.0.0.1:3001` by default, keeping the app behind a local
reverse proxy and avoiding Dokploy's host port 3000. Override the host port with
`VENDELIA_HTTP_PORT=...` in your shell if necessary. Internal app port stays 3000.
Never run `docker compose config` with real runtime secrets in a shared terminal
or paste its expanded output into a PR; use `config --quiet` to validate instead.

`/api/health/live` probes process liveness without loading the backend or querying
Supabase. The Dockerfile uses this endpoint for its HEALTHCHECK. `/api/health`
is the existing database connectivity probe. An unhealthy Docker status does not
by itself guarantee Docker will restart a process; Compose's restart policy is
for process exit/restart. Configure monitoring/deployment health checks as needed.

Production cookies are Secure. Use an HTTPS staging domain to verify login and
QR camera behavior; HTTP-only IP/LAN URLs are not a full production-flow test.
A localhost smoke check verifies the container, static files and API responses.

The root `.env` is for Docker Compose runtime injection. Normal `npm run dev`
still uses `backend/.env` and any frontend environment files; this deployment
change does not merge or move existing developer credentials. A `.env` in a
Dokploy checkout is not automatically loaded into its running application:
use Dokploy’s Environment editor. No real `.env` is created by this change.

## Dokploy application setup

1. Use an existing Dokploy installation or follow its official VPS installation
   guide. Do not reinstall the VPS OS/template over existing services. Check
   port conflicts before installing: Dokploy's proxy/panel use 80/443/3000.
2. Connect GitHub and create Project `Vendelia` -> Application.
3. Choose the repository and branch (`main` for production).
4. Build type: **Dockerfile**. Dockerfile path: `Dockerfile`. Build context/path:
   repository root (`.` or `/`, depending on the UI). Do not use `frontend/` as
   the Docker build context: backend/shared/npm workspace manifests are needed.
5. Keep the Dockerfile's default startup command. It runs
   `node frontend/server.js` in the runtime image. Do not override with root
   `npm start`, `next dev`, `tsx` or a separate backend process.
6. Add runtime environment variables using the template below. Do not set
   `BACKEND_URL`, `DATABASE_SSL=disable` or the local backend's `PORT=4000`.
   The container defaults are PORT=3000 and HOSTNAME=0.0.0.0. If a global VPS
   configuration overrides them, set these values explicitly in the app.
7. Deploy. Inspect build/runtime logs. Build needs outbound access to the npm
   registry, base-image registry and Google Fonts (Next's font build step).
   Supabase secrets are supplied only at runtime, not required as build args.
8. Under Domains, configure an HTTPS staging hostname, path `/`, container port
   **3000**, and automatic certificate issuance. Route through Dokploy's proxy;
   do not publish the app's port 3000 on the VPS host (the panel already uses it).
9. Enable GitHub automatic deployment once the first deployment is verified.
   A separate CI/CD service is not required. This change adds no GitHub Actions.

Dokploy Application mode uses the Dockerfile directly; root Compose is optional
and its host-port mapping is not required for that setup.

## Runtime configuration

Copy values from the existing Vercel deployment for the same Supabase project:

- `DATABASE_URL`: existing pooler connection with TLS. The container needs DNS
  and outbound access to its database host/port. Do not swap to local Postgres.
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` and
  `SUPABASE_STORAGE_BUCKET` (`Vendelia Main`). Enter bucket name without quotes
  in Dokploy's individual value field. Keep the server secret server-only.
- `PUBLIC_SITE_URL` and `FRONTEND_URL`: the exact HTTPS origin used to visit the
  deployment. For staging, use staging in both, then the canonical production
  origin for production. Other origins may be refused for mutations.
- Existing commission/VAT, voucher validity, refund window, payment bypass and
  bypass allow-list settings. The example defaults to bypass off; deliberately
  copy the desired current test settings rather than accidentally enabling sales.
- Existing SMTP host/port/user/password, sender and reply-to settings. Production
  has no development email outbox fallback. Verify outbound SMTP connectivity
  and sender-domain settings on the VPS.

Restart/redeploy after runtime configuration changes. There is no need to
rebuild for these server-only values. Future NEXT_PUBLIC_* variables would be
build-time values and must never contain secrets.

The existing `frontend/vercel.json` only configures Vercel's region. It is not
used by this container. There is no need to remove it during a staged migration.

## Verification and domain cutover

Before moving www.vendelia.fi, test on the HTTPS staging hostname:

1. Process probe `/api/health/live`, DB probe `/api/health`, catalogue and deals.
2. Admin and business sign-in, role isolation and sign-out.
3. Existing images, new Storage uploads and deal preview iframe.
4. Restricted test checkout, emailed/downloaded voucher PDF and QR destination.
5. QR camera lookup and merchant redemption of a test voucher.
6. Admin voucher lookup/refunds and merchant payout preview.

Testing against production Supabase can create real records/email even with test
checkout; use controlled accounts/vouchers and keep the bypass allow-list tight.
The container setup itself never seeds, migrates or changes existing data.

For cutover: configure the production domain in Dokploy, set canonical origin
variables, update web A/CNAME records and remove conflicting old AAAA entries if
needed. Preserve email MX/TXT records. Ensure apex redirects consistently to the
chosen www origin. Keep Vercel available and record the old DNS values for
rollback. Database/Auth/Storage remain on Supabase throughout.

## Operations

Persist application records in Supabase, not in the container filesystem.
Redeployments replace the container; there is no production local-upload/outbox
volume. Docker cache/image assets can be regenerated. Prefer one replica initially;
multiple independent Next instances need coordinated caching/deployment settings.
Compose rotates logs; configure log retention and disk monitoring in Dokploy too.
Builds compete for VPS RAM/CPU, so start with one build at a time and monitor.

References: [Next standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output),
[Dokploy installation](https://docs.dokploy.com/docs/core/installation),
[Dokploy domains](https://docs.dokploy.com/docs/core/domains).

## Verification performed for this change

The production Dockerfile was built successfully without Supabase credentials.
The final image ran as user `node` on an isolated Docker network with a disposable
PostgreSQL container and the existing catalogue test fixtures. Checks passed for:

- `/api/health/live` and Docker HEALTHCHECK (`healthy`).
- `/api/health` reaching the disposable database.
- Embedded API initialization: `/api/auth/config`, `/api/meta`, `/api/deals`.
- `/en` server rendering, a referenced Next static asset and `/favicon.svg`.
- Unauthenticated admin refund/merchant payout routes returning 401.
- No root/backend/frontend local .env file in the runtime image.
- Workspace type checks, 35 frontend tests, Compose structure validation and
  whitespace checks.

The initial image was approximately 295 MB locally (architecture/base-tag
updates can change this). Test containers/network were removed afterward; the
local smoke-test image can be reused or removed. Full authenticated flows, SMTP,
Supabase TLS and QR camera behavior still need verification on the HTTPS staging
deployment. No live database, DNS or VPS deployment was modified.
