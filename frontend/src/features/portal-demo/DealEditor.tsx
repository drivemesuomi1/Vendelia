"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import { DealForm } from "@/features/merchant/components/DealForm";
import { resubmitDeal, submitDeal, useBusinessSession, useDemoStore } from "./store";

/** New deal (no id) or edit of the signed-in business's own deal; either way it goes to admin review. */
export function DealEditor({ id }: { id?: string }) {
  const { t, locale } = useI18n();
  const business = useBusinessSession();
  const { deals } = useDemoStore();
  if (!business) return null;
  const deal = id ? deals.find((d) => d.id === id && d.businessId === business.id) : undefined;

  if (id && !deal) {
    return (
      <div className="panel empty-state">
        <h3>{t("business.notFound")}</h3>
        <Link className="btn btn-secondary btn-sm" href={`/${locale}/business`}>{t("business.myDeals")}</Link>
      </div>
    );
  }

  return (
    <div className="adm">
      <header className="adm-head">
        <div>
          <h1>{t(deal ? "business.editDeal" : "business.createDeal")}</h1>
          <p className="muted small">{t(deal?.status === "live" ? "business.editLiveNote" : "business.reviewNote")}</p>
        </div>
      </header>
      {deal?.status === "rejected" && deal.reviewNote && (
        <p className="review-note"><b>{t("business.rejectedReason")}:</b> {deal.reviewNote}</p>
      )}
      <DealForm
        key={deal?.id ?? "new"}
        initial={deal?.input}
        onSave={(input) => (deal ? resubmitDeal(deal.id, input) : void submitDeal(business.id, input))}
      />
    </div>
  );
}
