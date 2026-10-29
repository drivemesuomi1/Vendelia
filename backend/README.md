# Backend (placeholder)

This folder is intentionally minimal. The team is writing the real backend here.

- **Contract to implement:** [`docs/api/endpoints.md`](../docs/api/endpoints.md). Request/response shapes are in `shared/`
  (`shared/src/schemas` for validation, `shared/src/types/api.ts` for responses).
- **Reference implementation:** the `backend-reference` git branch has a complete working backend
  (Fastify + Drizzle + Postgres, money/VAT/commission rules, vouchers, refunds, ledger, payouts, jobs, tests).
  Use it as a guide or copy parts: `git checkout backend-reference -- backend/src/domain`.
- **Folder structure to keep:** `src/{modules,domain,integrations,jobs,db,middleware,config}`.

Run: `npm run dev -w backend` (serves `GET /api/health` on :4000).
