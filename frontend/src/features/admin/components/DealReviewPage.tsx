"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AdminDealDTO } from "@vendelia/shared";
import { Icon } from "@/components/ui/Icon";
import { useI18n } from "@/i18n/I18nProvider";
import { formatDate } from "@/lib/format";
import { reviewDeal } from "../api";
import { DealReviewForm } from "./DealReviewDrawer";

/** One deal on its own page: full preview, then approve, reject (reason required) or take a live deal off sale. */
export function DealReviewPage({ deal }: { deal: AdminDealDTO }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const back = `/${locale}/admin/deals`;
  return (
    <div className="adm">
      <Link className="back-link" href={back}><Icon name="left" />{t("admin.deals")}</Link>
      <header className="adm-head">
        <div>
          <h1>{t("admin.dr.reviewTitle")}</h1>
          <p className="muted small">{t("admin.dr.submittedBy", { name: deal.merchantName, date: formatDate(deal.submittedAt ?? deal.createdAt, locale) })}</p>
        </div>
      </header>
      <DealReviewForm
        deal={deal}
        variant="page"
        onDecision={async (id, decision, note) => { await reviewDeal(id, decision, note); }}
        onDone={() => { router.push(back); router.refresh(); }}
      />
    </div>
  );
}
