import { generateToken } from "../../domain/codes";
import type { PaymentProvider } from "./payment-provider";

/**
 * Development provider: no money moves. The frontend shows a simulated payment
 * step and then calls POST /api/payments/:orderId/mock-confirm, which plays the
 * role of the provider's "payment succeeded" webhook.
 */
export function createMockPaymentProvider(): PaymentProvider {
  return {
    name: "mock",
    async createPayment() {
      return { ref: `mock_${generateToken(12)}`, action: "confirm_mock" };
    },
    async refund() {
      return { refundRef: `mock_refund_${generateToken(12)}` };
    },
  };
}
