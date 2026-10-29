# Local development

Requirements: Node.js 20.11+ (22 recommended).

```bash
npm install
npm run dev          # API placeholder on :4000 and web on :3000 together
```

Open http://localhost:3000 (redirects to `/fi`).

The backend is currently a placeholder (`GET /api/health` only), so the site shows the built-in cities and categories and an empty
catalogue; sign-in and checkout return "service not available yet". To work against a complete API, check out the reference implementation:

```bash
git worktree add ../vendelia-backend-reference backend-reference
cd ../vendelia-backend-reference && npm install && npm run dev
```

(It uses an embedded Postgres, demo logins and a mock payment provider; see its own `docs/runbooks/local-development.md`.)

## Checks
```bash
npm run typecheck
npm test
npm run build
```

## Deploying the frontend (Vercel)
The Vercel project `vendelia` is set to: framework Next.js, root directory `frontend`, "include source files outside root" on,
install command `cd .. && npm ci`. Deploy with `vercel deploy --prod` from the repo root. Set the `BACKEND_URL` environment variable
in Vercel when an API exists so `/api/*` is forwarded to it.
