/** Platform policy is server configuration until a settings table is introduced. */
export interface PlatformConfig {
  commissionBps: number;
  commissionVatBps: number;
  voucherValidityMonths: number;
  refundWindowDays: number;
}

export function platformConfig(env: NodeJS.ProcessEnv = process.env): PlatformConfig {
  const integer = (key: string, fallback: number, min: number, max: number) => {
    if (env[key] !== undefined && !/^\d+$/.test(env[key]!)) throw new Error(`Invalid ${key}`);
    const value = env[key] === undefined ? fallback : Number(env[key]);
    if (!Number.isInteger(value) || value < min || value > max) throw new Error(`Invalid ${key}`);
    return value;
  };
  return {
    commissionBps: integer("COMMISSION_BPS", 1500, 0, 10000),
    commissionVatBps: integer("COMMISSION_VAT_BPS", 2550, 0, 10000),
    voucherValidityMonths: integer("VOUCHER_VALIDITY_MONTHS", 3, 1, 120),
    refundWindowDays: integer("REFUND_WINDOW_DAYS", 14, 0, 365),
  };
}
