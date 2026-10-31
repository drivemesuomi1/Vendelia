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

/** Checkout, voucher and email settings, read from server environment. */
export interface OrderConfig {
  /**
   * TEMPORARY test checkout: when true, orders skip payment and are stored and emailed as
   * test/unpaid. Set PAYMENT_BYPASS=false (or remove it) once a payment provider is live.
   */
  paymentBypass: boolean;
  /** Optional guard for the bypass: only these emails or @domains may place test orders. */
  bypassAllowedEmails: string[];
  /** Public site origin used in QR codes and email links. */
  siteUrl: string;
  mail: {
    from: string;
    replyTo: string;
    smtp: { host: string; port: number; secure: boolean; user?: string; pass?: string } | null;
    /** Without SMTP outside production, emails are written here instead of sent. */
    outboxDir: string | null;
  };
}

export function orderConfig(env: NodeJS.ProcessEnv = process.env): OrderConfig {
  const flag = (key: string) => {
    const value = env[key]?.trim().toLowerCase();
    if (!value || value === "false" || value === "0") return false;
    if (value === "true" || value === "1") return true;
    throw new Error(`Invalid ${key}`);
  };
  const port = Number(env.SMTP_PORT ?? 587);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid SMTP_PORT");
  const host = env.SMTP_HOST?.trim();
  return {
    paymentBypass: flag("PAYMENT_BYPASS"),
    bypassAllowedEmails: (env.PAYMENT_BYPASS_ALLOWED_EMAILS ?? "")
      .split(",").map((entry) => entry.trim().toLowerCase()).filter(Boolean),
    siteUrl: (env.PUBLIC_SITE_URL?.trim() || "https://www.vendelia.fi").replace(/\/+$/, ""),
    mail: {
      from: env.MAIL_FROM?.trim() || "Vendelia <info@vendelia.fi>",
      replyTo: env.MAIL_REPLY_TO?.trim() || "info@vendelia.fi",
      smtp: host ? {
        host, port, secure: env.SMTP_SECURE ? flag("SMTP_SECURE") : port === 465,
        user: env.SMTP_USER?.trim() || undefined, pass: env.SMTP_PASS || undefined,
      } : null,
      outboxDir: env.NODE_ENV === "production" ? null : (env.MAIL_OUTBOX_DIR?.trim() || ".data/outbox"),
    },
  };
}
