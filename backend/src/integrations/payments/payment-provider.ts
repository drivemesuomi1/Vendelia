import type { PaymentMethod } from "@vendelia/shared";

/**
 * Contract every payment provider adapter implements. Services depend on this
 * interface only, so Stripe, Paytrail or the mock can be swapped via config.
 */
export interface PaymentProvider {
  readonly name: string;
  createPayment(input: {
    orderId: string;
    orderNumber: string;
    amountCents: number;
    method: PaymentMethod;
    bank?: string;
    returnUrl: string;
  }): Promise<{ ref: string; action: "confirm_mock" | "redirect"; redirectUrl?: string }>;
  refund(input: { ref: string; amountCents: number; reason: string }): Promise<{ refundRef: string }>;
}
