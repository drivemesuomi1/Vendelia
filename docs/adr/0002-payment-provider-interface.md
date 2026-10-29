# ADR 0002 – Payments behind a provider interface

**Status:** accepted · **Date:** 2026-10-29

## Decision
Checkout depends only on `PaymentProvider` (`backend/src/integrations/payments/payment-provider.ts`):
`createPayment()` and `refund()`. The provider is chosen with `PAYMENT_PROVIDER`.

- `mock` (default): no money moves. The frontend shows a simulated bank/MobilePay step and calls
  `POST /api/payments/:orderId/mock-confirm`, which plays the role of the provider webhook.
- `stripe`: **not implemented yet.** Planned: Stripe Connect (Express accounts), funds held on the platform
  and transferred to the merchant after redemption; webhooks verified in `payments.routes.ts`, then `ordersService.markPaid()`.

## Why
Vendelia must not hold customers' money in its own bank account (payment-institution licence risk). A licensed
provider handles funds; the interface lets us choose Stripe or a Finnish provider (Paytrail) without touching checkout.

## Guarantees already in place
- `markPaid` is idempotent and row-locks the order, so duplicate webhooks cannot double-issue vouchers.
- Refunds call the provider inside the DB transaction; if the provider fails, the voucher stays active.
