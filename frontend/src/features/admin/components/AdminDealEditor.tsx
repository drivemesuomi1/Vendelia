"use client";

import type { AdminDealDTO } from "@vendelia/shared";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Icon } from "@/components/ui/Icon";
import { useI18n } from "@/i18n/I18nProvider";
import { DealChip } from "@/features/portal-demo/DealChip";
import { DealForm } from "@/features/merchant/components/DealForm";
import { uploadImage } from "@/features/merchant/api";
import { adminUpdateDeal } from "../api";

/**
 * An admin editing a business's deal with the same form the business uses. Changes are saved straight away and
 * the deal keeps its status, so a live deal stays on sale; `fromBusiness` keeps the business in the trail.
 */
export function AdminDealEditor({ deal, fromBusiness }: { deal: AdminDealDTO; fromBusiness: boolean }) {
  const { t, locale } = useI18n();
  const base = `/${locale}/admin`;
  const reviewHref = `${base}/deals/${deal.id}${fromBusiness ? "?from=business" : ""}`;
  const trail = fromBusiness
    ? [{ label: t("admin.merchants"), href: `${base}/businesses` }, { label: deal.merchantName, href: `${base}/businesses/${deal.merchantId}` }]
    : [{ label: t("admin.deals"), href: `${base}/deals` }];

  return (
    <div className="adm">
      <Breadcrumbs items={[{ label: t("admin.overview"), href: base }, ...trail, { label: deal.input.title.fi, href: reviewHref }, { label: t("admin.de.title") }]} />
      <header className="adm-head">
        <div>
          <h1>{t("admin.de.title")}</h1>
          <p className="muted small">{t("admin.de.sub", { name: deal.merchantName })}</p>
        </div>
        <DealChip status={deal.status === "draft" ? "pending" : deal.status} />
      </header>
      <p className="review-note ok"><Icon name="info" /><span>{t(deal.status === "live" ? "admin.de.liveNote" : "admin.de.keepNote")}</span></p>
      <DealForm
        key={deal.id}
        dealId={deal.id}
        initial={deal.input}
        admin={{
          save: (input) => adminUpdateDeal(deal.id, input),
          upload: async (file) => (await uploadImage(file, `/api/admin/deals/${deal.id}/uploads`)).url,
          doneHref: reviewHref,
        }}
      />
    </div>
  );
}
