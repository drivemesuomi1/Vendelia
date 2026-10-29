"use client";

import Link from "next/link";
import type { MerchantOverviewDTO, SessionUserDTO } from "@vendelia/shared";
import { Icon } from "@/components/ui/Icon";
import { Notice } from "@/components/ui/Notice";
import { useI18n } from "@/i18n/I18nProvider";
import { formatMoney, loc } from "@/lib/format";
import { DealStatusChip } from "./DealStatusChip";

export function OverviewView({ data, user }: { data: MerchantOverviewDTO; user: SessionUserDTO }) {
  const { t, locale } = useI18n();
  const pendingMerchant = user.merchant?.status !== "active";
  return (
    <>
      <div className="row between wrap-row" style={{ gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28 }}>{t("business.overview")}</h1>
          <p className="muted">{user.merchant?.companyName}</p>
        </div>
        {!pendingMerchant && <Link className="btn btn-primary" href={`/${locale}/business/deals/new`}><Icon name="plus" /> {t("business.createDeal")}</Link>}
      </div>
      {pendingMerchant && <Notice className="mt" tone="warn" icon="clock">{t("business.pendingApproval")}</Notice>}
      <div className="grid kpis" style={{ marginTop: "var(--s3)" }}>
        <div className="card pad kpi"><p className="muted small">{t("business.kpiSold")}</p><p className="v">{data.vouchersSold}</p></div>
        <div className="card pad kpi"><p className="muted small">{t("business.kpiRedeemed")}</p><p className="v">{data.vouchersRedeemed}</p></div>
        <div className="card pad kpi"><p className="muted small">{t("business.kpiGross")}</p><p className="v">{formatMoney(data.grossSalesCents, locale)}</p></div>
        <div className="card pad kpi"><p className="muted small">{t("business.kpiNextPayout")}</p><p className="v">{formatMoney(data.nextPayoutCents, locale)}</p><p className="hint">{t("business.kpiNextPayoutHint")}</p></div>
      </div>
      <div className="card" style={{ marginTop: "var(--s3)" }}>
        <div className="pad"><h2 style={{ fontSize: 20 }}>{t("business.yourDeals")}</h2></div>
        {data.deals.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("business.colDeal")}</th><th>{t("business.colStatus")}</th><th className="num">{t("business.colPrice")}</th>
                  <th className="num">{t("business.colYouReceive")}</th><th className="num">{t("business.colSold")}</th><th><span className="sr-only">{t("business.edit")}</span></th>
                </tr>
              </thead>
              <tbody>
                {data.deals.map((d) => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 500 }}>{loc(d.title, locale)}</td>
                    <td><DealStatusChip status={d.status} /></td>
                    <td className="num">{formatMoney(d.fromPriceCents, locale)}</td>
                    <td className="num">{formatMoney(d.payoutCents, locale)}</td>
                    <td className="num">{d.sold}</td>
                    <td><Link className="btn btn-ghost btn-sm" href={`/${locale}/business/deals/${d.id}/edit`}>{t("business.edit")}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="pad muted">{t("business.noDeals")}</p>
        )}
      </div>
    </>
  );
}
