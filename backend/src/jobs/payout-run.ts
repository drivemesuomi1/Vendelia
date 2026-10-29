import type { AppContext } from "../context";
import { payoutsService } from "../modules/payouts/payouts.service";

/** Twice a month: pays merchants for vouchers redeemed since their last payout. */
export async function runPayouts(ctx: AppContext) {
  const created = await payoutsService.run(ctx);
  return { payouts: created.length, totalCents: created.reduce((a, p) => a + p.amountCents, 0) };
}
