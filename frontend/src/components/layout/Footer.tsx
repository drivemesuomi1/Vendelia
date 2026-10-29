"use client";

import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { useI18n } from "@/i18n/I18nProvider";

export function Footer() {
  const { t, locale } = useI18n();
  const l = (p: string) => `/${locale}${p}`;
  return (
    <footer className="site">
      <div className="wrap">
        <div className="foot">
          <div>
            <Logo href={l("")} label={t("nav.homeLabel")} />
            <p className="muted small" style={{ marginTop: 12, maxWidth: 260 }}>{t("footer.tagline")}</p>
            <div className="paylogos" aria-label={t("footer.paymentMethods")}>
              <span>{t("checkout.bank")}</span><span>MobilePay</span><span>Visa</span><span>Mastercard</span>
            </div>
          </div>
          <div>
            <h4>{t("footer.customers")}</h4>
            <Link href={l("#how")}>{t("footer.howVouchersWork")}</Link>
            <Link href={l("/account/vouchers")}>{t("nav.myVouchers")}</Link>
            <Link href={l("/account/vouchers")}>{t("footer.cancelPurchase")}</Link>
          </div>
          <div>
            <h4>{t("nav.forBusinesses")}</h4>
            <Link href={l("/register/business")}>{t("footer.sellOn")}</Link>
            <Link href={l("/business/payouts")}>{t("footer.pricing")}</Link>
          </div>
          <div>
            <h4>{t("footer.help")}</h4>
            <a href="mailto:tuki@vendelia.fi">tuki@vendelia.fi</a>
          </div>
        </div>
        <div className="legal">
          <span>© {new Date().getFullYear()} Mansio Group Oy · {t("common.businessId")} 3631044-9</span>
        </div>
      </div>
    </footer>
  );
}
