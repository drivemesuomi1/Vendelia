"use client";

import Link from "next/link";
import { COMPANY, COMPANY_TEL } from "@vendelia/shared";
import { Logo } from "@/components/ui/Logo";
import { useI18n } from "@/i18n/I18nProvider";
import { useAppData } from "@/lib/meta-context";
import { loc } from "@/lib/format";

export function Footer() {
  const { t, locale } = useI18n();
  const { meta } = useAppData();
  const l = (p: string) => `/${locale}${p}`;
  return (
    <footer className="site">
      <div className="wrap">
        <div className="foot">
          <div>
            <Logo href={l("")} label={t("nav.homeLabel")} />
            <p className="muted small" style={{ marginTop: 12, maxWidth: 260 }}>{t("footer.tagline", { cities: meta.cities.map((city) => loc(city.name, locale)).join(", ") })}</p>
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
            <Link href={l("/business")}>{t("footer.pricing")}</Link>
          </div>
          <div>
            <h4>{t("footer.help")}</h4>
            <p className="foot-contact">
              <small>{t("footer.customerService")}</small>
              <a href={`mailto:${COMPANY.customerEmail}`}>{COMPANY.customerEmail}</a>
            </p>
            <p className="foot-contact">
              <small>{t("footer.businessSupport")}</small>
              <a href={`mailto:${COMPANY.businessEmail}`}>{COMPANY.businessEmail}</a>
            </p>
            <p className="foot-contact">
              <small>{t("footer.phone")}</small>
              <a href={COMPANY_TEL}>{COMPANY.phone}</a>
            </p>
          </div>
        </div>
        <div className="legal">
          <span>© {new Date().getFullYear()} {COMPANY.name} · {t("common.businessId")} {COMPANY.businessId}</span>
        </div>
      </div>
    </footer>
  );
}
