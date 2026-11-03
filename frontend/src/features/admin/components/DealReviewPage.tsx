"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AdminDealDTO } from "@vendelia/shared";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { useI18n } from "@/i18n/I18nProvider";
import { formatDate } from "@/lib/format";
import { reviewDeal } from "../api";
import { DealReviewForm } from "./DealReviewDrawer";

/**
 * One deal on its own page: full preview, then approve, reject or take a live deal off sale, with feedback for the business.
 * `fromBusiness` is set when the admin arrived from a business page, so the trail and the way back match.
 */
export function DealReviewPage({ deal, fromBusiness }: { deal: AdminDealDTO; fromBusiness: boolean }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const base = `/${locale}/admin`;
  const businessHref = `${base}/businesses/${deal.merchantId}`;
  const back = fromBusiness ? businessHref : `${base}/deals`;
  const trail = fromBusiness
    ? [{ label: t("admin.merchants"), href: `${base}/businesses` }, { label: deal.merchantName, href: businessHref }]
    : [{ label: t("admin.deals"), href: `${base}/deals` }];
  return (
    <div className="adm">
      <Breadcrumbs items={[{ label: t("admin.overview"), href: base }, ...trail, { label: deal.input.title.fi }]} />
      <header className="adm-head">
        <div>
          <h1>{t("admin.dr.reviewTitle")}</h1>
          <p className="muted small">
            <Link className="row-link" href={businessHref}>{deal.merchantName}</Link> · {t("admin.dr.submitted")} {formatDate(deal.submittedAt ?? deal.createdAt, locale)}
          </p>
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
