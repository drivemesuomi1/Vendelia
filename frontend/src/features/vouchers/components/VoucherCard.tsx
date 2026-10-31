"use client";

import type { VoucherDTO } from "@vendelia/shared";
import { Icon } from "@/components/ui/Icon";
import { LogoSymbol } from "@/components/ui/Logo";
import { Notice } from "@/components/ui/Notice";
import { useI18n } from "@/i18n/I18nProvider";
import { useAppData } from "@/lib/meta-context";
import { formatDate, itemTitle, loc } from "@/lib/format";
import { QrCode } from "./QrCode";

/** The voucher itself: QR, code, expiry, business, address and next step. */
export function VoucherCard({ v }: { v: VoucherDTO }) {
  const { t, locale } = useI18n();
  const { meta } = useAppData();
  const city = meta.cities.find((c) => c.id === v.cityId);
  const address = `${v.meetingPoint ? t("deal.meetingPoint") + " " : ""}${v.street}, ${v.zip} ${loc(city?.name, locale)}`;
  return (
    <div className="card pad voucher">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <QrCode value={v.qrPayload} label={t("vouchers.qrLabel", { code: v.code })} />
        <span className="code">{v.code}</span>
      </div>
      <div className="stack">
        <div className="row between wrap-row">
          {v.test
            ? <span className="chip danger"><Icon name="info" />{t("vouchers.testUnpaid")}</span>
            : <span className="chip teal"><Icon name="checkc" />{t("vouchers.validUnused")}</span>}
          <LogoSymbol height={28} />
        </div>
        <h2 style={{ fontSize: 20 }}>{itemTitle(v.title, null, v.optionLabel, locale)}</h2>
        {v.recipientName && (
          <p className="chip indigo" style={{ alignSelf: "flex-start" }}>
            <Icon name="gift" />
            {t("vouchers.giftFor", { name: v.recipientName })}
          </p>
        )}
        <dl className="kv">
          <dt>{t("vouchers.business")}</dt><dd>{v.merchantName}</dd>
          {/* Services done at the customer's place (e.g. cleaning) have no street address. */}
          {v.street && <><dt>{t("vouchers.address")}</dt><dd>{address}</dd></>}
          <dt>{t("vouchers.purchased")}</dt><dd>{formatDate(v.issuedAt, locale)}</dd>
          <dt>{t("vouchers.validLabel")}</dt><dd><b>{t("vouchers.untilDate", { date: formatDate(v.expiresAt, locale) })}</b></dd>
          <dt>{t("vouchers.order")}</dt><dd>{v.orderNumber}</dd>
        </dl>
        {v.howTo && (
          <Notice tone="indigo" icon="info">
            <p><b>{t("vouchers.nextStep")}</b> {loc(v.howTo, locale)}</p>
          </Notice>
        )}
      </div>
    </div>
  );
}
