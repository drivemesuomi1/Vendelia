# ADR 0001 – Separate frontend and backend in one repository

**Status:** accepted · **Date:** 2026-10-29

## Context
Vendelia needs a customer site, a business portal and an admin area at launch, with mobile apps later. The team works in TypeScript.

## Decision
- One repository, npm workspaces: `frontend/`, `backend/`, `shared/`.
- **frontend** – Next.js 16 (React, App Router). Pages are rendered on the server so deal pages are indexable. The browser calls `/api/*` on the same origin. The Next Node route invokes the Fastify app in-process by default, or forwards to a separate API when BACKEND_URL is configured.
- **backend** – Node.js + Fastify + Drizzle ORM on Postgres. Owns all business rules, money and data. Mobile apps will use the same API.
- **shared** – Zod schemas and DTO types used by both sides. No runtime business logic.

## Layering in the backend
`routes → service → repository → db`, with pure rules in `domain/` (money, VAT, commission, voucher lifecycle) and outside services behind interfaces in `integrations/`. Services receive an explicit `AppContext` (db, clock, mailer, payments…), which makes them testable without mocks of globals.

## Consequences
- Separate frontend/backend source workspaces. Deployment can use one Vercel application with the API in-process, or a separate Fastify host selected by BACKEND_URL.
- Prices are never trusted from the browser: the cart only stores ids; `/api/cart/quote` and checkout price on the server.
- The catalogue requires DATABASE_URL pointing to the configured Postgres database. Missing configuration produces an error rather than hardcoded data.
