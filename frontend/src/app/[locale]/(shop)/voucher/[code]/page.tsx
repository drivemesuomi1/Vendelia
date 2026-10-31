import Link from "next/link";
import type { RedeemLookupDTO } from "@vendelia/shared";
import { Icon } from "@/components/ui/Icon";
import { LogoSymbol } from "@/components/ui/Logo";
import { Notice } from "@/components/ui/Notice";
import { getT, resolveLocale } from "@/i18n/server";
import { formatDate, itemTitle } from "@/lib/format";
import { serverApi } from "@/lib/server-api";

export const metadata = { robots: { index: false } };

/** Opened by scanning a voucher's QR code: is this code valid? Shows no customer details. */
export default async function VoucherCheckPage({ params }: { params: Promise<{ locale: string; code: string }> }) {
  const locale = await resolveLocale(params);
  const t = getT(locale);
  const { code: raw } = await params;
  const code = decodeURIComponent(raw);
  const r = await serverApi<RedeemLookupDTO>(`/api/vouchers/${encodeURIComponent(code)}`);

  const reason = {
    not_found: t("business.rNotFound"),
    other_merchant: t("business.rOther"),
    redeemed: t("business.rUsed", { date: r.redeemedAt ? formatDate(r.redeemedAt, locale) : "" }),
    refunded: t("business.rRefunded"),
    expired: t("business.rExpired", { date: r.expiresAt ? formatDate(r.expiresAt, locale) : "" }),
    valid: "",
  }[r.result];

  return (
    <main className="wrap" style={{ paddingTop: "var(--s5)", paddingBottom: "var(--s6)", maxWidth: 560 }}>
      <div className="card pad stack" style={{ textAlign: "center", alignItems: "center" }}>
        <LogoSymbol height={36} />
        <h1 style={{ fontSize: 24 }}>{t("voucherCheck.title")}</h1>
        <span className="code" style={{ fontSize: 22 }}>{r.code}</span>
        {r.result === "valid" ? (
          <>
            <div className="row wrap-row" style={{ justifyContent: "center" }}>
              <span className="chip teal"><Icon name="checkc" />{t("vouchers.validUnused")}</span>
              {r.test && <span className="chip danger"><Icon name="info" />{t("vouchers.testUnpaid")}</span>}
            </div>
            <p style={{ fontWeight: 600, fontSize: 18 }}>{itemTitle(r.title!, null, r.optionLabel ?? null, locale)}</p>
            <p className="muted">{t("vouchers.validUntil", { date: formatDate(r.expiresAt!, locale) })}</p>
          </>
        ) : (
          <Notice tone="warn" icon="xc"><p>{reason}</p></Notice>
        )}
        {r.test && r.result === "valid" && <Notice tone="danger" icon="info"><p>{t("checkout.testOrderText")}</p></Notice>}
        <p className="hint">{t("voucherCheck.merchantNote")}</p>
        <Link className="btn btn-secondary" href={`/${locale}/business/redeem?code=${encodeURIComponent(r.code)}`}>
          {t("voucherCheck.openPortal")}
        </Link>
      </div>
    </main>
  );
}
