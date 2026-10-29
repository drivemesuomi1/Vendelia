"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AdminDealRowDTO } from "@vendelia/shared";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/i18n/I18nProvider";
import { formatDate, formatMoney, loc } from "@/lib/format";
import { DealStatusChip } from "@/features/merchant/components/DealStatusChip";
import { reviewDeal } from "../api";

export function DealReviewTable({ deals }: { deals: AdminDealRowDTO[] }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  async function decide(id: string, decision: "approve" | "reject") {
    const note = decision === "reject" ? window.prompt(t("admin.rejectReason")) ?? undefined : undefined;
    setBusy(id);
    try {
      await reviewDeal(id, decision, note);
      toast(decision === "approve" ? t("admin.approved") : t("admin.rejected"));
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (!deals.length) return <p className="pad muted">{t("admin.nothingToReview")}</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr><th>{t("business.colDeal")}</th><th>{t("admin.merchant")}</th><th>{t("business.colStatus")}</th><th className="num">{t("business.colPrice")}</th><th>{t("admin.created")}</th><th><span className="sr-only">{t("admin.actions")}</span></th></tr>
        </thead>
        <tbody>
          {deals.map((d) => (
            <tr key={d.id}>
              <td style={{ fontWeight: 500 }}>{d.status === "live" ? <Link href={`/${locale}/deals/${d.slug}`}>{loc(d.title, locale)}</Link> : loc(d.title, locale)}</td>
              <td>{d.merchantName}</td>
              <td><DealStatusChip status={d.status} /></td>
              <td className="num">{formatMoney(d.fromPriceCents, locale)}</td>
              <td>{formatDate(d.createdAt, locale)}</td>
              <td>
                {d.status === "pending" && (
                  <div className="row">
                    <button className="btn btn-primary btn-sm" disabled={busy === d.id} onClick={() => decide(d.id, "approve")}>{t("admin.approve")}</button>
                    <button className="btn btn-danger btn-sm" disabled={busy === d.id} onClick={() => decide(d.id, "reject")}>{t("admin.reject")}</button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
