import Link from "next/link";
import type { AdminDealRowDTO } from "@vendelia/shared";
import { getT, resolveLocale } from "@/i18n/server";
import { adminData } from "@/lib/admin-api";
import { DealReviewTable } from "@/features/admin/components/DealReviewTable";

/** Deal approval queue (pending first) and all deals. */
export default async function AdminDealsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ status?: string }> }) {
  const locale = await resolveLocale(params);
  const t = getT(locale);
  const { status = "pending" } = await searchParams;
  const q = status === "all" ? "" : `?status=${encodeURIComponent(status)}`;
  const { deals } = await adminData<{ deals: AdminDealRowDTO[] }>(`/api/admin/deals${q}`, { deals: [] });
  const tabs = ["pending", "live", "rejected", "all"];
  return (
    <>
      <h1 style={{ fontSize: 28 }}>{t("admin.deals")}</h1>
      <div className="filters" style={{ marginTop: "var(--s2)" }}>
        {tabs.map((s) => (
          <Link key={s} className="cat" style={{ minHeight: 44 }} aria-pressed={s === status} href={`/${locale}/admin?status=${s}`}>{t(`admin.tab.${s}`)}</Link>
        ))}
      </div>
      <div className="card"><DealReviewTable deals={deals} /></div>
    </>
  );
}
