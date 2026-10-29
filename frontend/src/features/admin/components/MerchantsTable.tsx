"use client";

import { useRouter } from "next/navigation";
import type { AdminMerchantRowDTO } from "@vendelia/shared";
import { Icon } from "@/components/ui/Icon";
import { useI18n } from "@/i18n/I18nProvider";
import { formatDate } from "@/lib/format";
import { setMerchantStatus } from "../api";

export function MerchantsTable({ merchants }: { merchants: AdminMerchantRowDTO[] }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const change = async (id: string, status: "active" | "suspended") => {
    await setMerchantStatus(id, status);
    router.refresh();
  };
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr><th>{t("admin.merchant")}</th><th>{t("common.businessId")}</th><th>{t("admin.email")}</th><th>{t("business.colStatus")}</th><th className="num">{t("admin.liveDeals")}</th><th>{t("admin.created")}</th><th><span className="sr-only">{t("admin.actions")}</span></th></tr>
        </thead>
        <tbody>
          {merchants.map((m) => (
            <tr key={m.id}>
              <td><b>{m.name}</b><div className="hint">{m.companyName}</div></td>
              <td>{m.businessId}</td>
              <td>{m.email}</td>
              <td>
                {m.status === "active" ? <span className="chip teal"><Icon name="checkc" />{t("admin.active")}</span>
                  : m.status === "pending" ? <span className="chip warn"><Icon name="clock" />{t("admin.pending")}</span>
                  : <span className="chip danger"><Icon name="xc" />{t("admin.suspended")}</span>}
              </td>
              <td className="num">{m.liveDeals}</td>
              <td>{formatDate(m.createdAt, locale)}</td>
              <td>
                {m.status !== "active" && <button className="btn btn-primary btn-sm" onClick={() => change(m.id, "active")}>{t("admin.activate")}</button>}
                {m.status === "active" && <button className="btn btn-danger btn-sm" onClick={() => change(m.id, "suspended")}>{t("admin.suspend")}</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
