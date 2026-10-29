import type { Env } from "../../config/env";
import { createMockPaymentProvider } from "./mock-provider";
import type { PaymentProvider } from "./payment-provider";

export type { PaymentProvider } from "./payment-provider";

export function createPaymentProvider(env: Env): PaymentProvider {
  switch (env.PAYMENT_PROVIDER) {
    case "mock":
      return createMockPaymentProvider();
    case "stripe":
      // Next step: Stripe Connect adapter (destination charges + transfers on redemption),
      // implementing PaymentProvider and verifying webhooks in payments.routes.
      throw new Error("Stripe adapter is not implemented yet. Use PAYMENT_PROVIDER=mock.");
  }
}
