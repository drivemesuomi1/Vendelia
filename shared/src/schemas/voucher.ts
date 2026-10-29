import { z } from "zod";
import { voucherCodeSchema } from "./common";

export const VOUCHER_STATUSES = ["active", "redeemed", "refunded", "expired"] as const;
export type VoucherStatus = (typeof VOUCHER_STATUSES)[number];

export const redeemLookupSchema = z.object({ code: voucherCodeSchema });

export const commissionSettingSchema = z.object({
  rateBps: z.number().int().min(0).max(5000),
});
