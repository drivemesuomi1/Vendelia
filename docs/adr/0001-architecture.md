# ADR 0001 – Separate frontend and backend in one repository

**Status:** accepted · **Date:** 2026-10-29

## Context
Vendelia needs a customer site, a business portal and an admin area at launch, with mobile apps later. The team works in TypeScript.

## Decision
- One repository, npm workspaces: `frontend/`, `backend/`, `shared/`.
- **frontend** – Next.js 16 (React, App Router). Pages are rendered on the server so deal pages are indexable. The browser calls `/api/*` on the same origin; `next.config.ts` forwards it to the backend, so the session cookie stays first-party.
- **backend** – Node.js + Fastify + Drizzle ORM on Postgres. Owns all business rules, money and data. Mobile apps will use the same API.
- **shared** – Zod schemas and DTO types used by both sides. No runtime business logic.

## Layering in the backend
`routes → service → repository → db`, with pure rules in `domain/` (money, VAT, commission, voucher lifecycle) and outside services behind interfaces in `integrations/`. Services receive an explicit `AppContext` (db, clock, mailer, payments…), which makes them testable without mocks of globals.

## Consequences
- Two processes to run and deploy (frontend + API).
- Prices are never trusted from the browser: the cart only stores ids; `/api/cart/quote` and checkout price on the server.
- Local development needs no database install: the backend falls back to PGlite (Postgres in WASM) when `DATABASE_URL` is empty.
