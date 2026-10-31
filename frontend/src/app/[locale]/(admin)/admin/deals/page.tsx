import Link from "next/link";
import type { AdminDealRowDTO } from "@vendelia/shared";
import { getT, resolveLocale } from "@/i18n/server";
import { adminData } from "@/lib/admin-api";
import { DealReviewTable } from "@/features/admin/components/DealReviewTable";
import { buildAdminDemo, demoDealRows } from "@/features/admin/mock-data";

/** Deal approval queue (pending first) and all deals. Shows demo rows until the admin API exists. */
export default async function AdminDealsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ status?: string }> }) {
  const locale = await resolveLocale(params);
  const t = getT(locale);
  const { status = "pending" } = await searchParams;
  const q = status === "all" ? "" : `?status=${encodeURIComponent(status)}`;
  const demo = demoDealRows(buildAdminDemo());
  const { deals } = await adminData<{ deals: AdminDealRowDTO[] }>(`/api/admin/deals${q}`, {
    deals: status === "all" ? demo : demo.filter((d) => d.status === status),
  });
  const tabs = ["pending", "live", "rejected", "draft", "all"];
  const count = (s: string) => (s === "all" ? demo.length : demo.filter((d) => d.status === s).length);
  return (
    <div className="adm">
      <header className="adm-head">
        <div>
          <h1>{t("admin.deals")}</h1>
          <p className="muted small">{t("admin.dealsSub")}</p>
        </div>
      </header>
      <div className="seg seg-tabs" role="group" aria-label={t("admin.order.status")}>
        {tabs.map((s) => (
          <Link key={s} aria-pressed={s === status} href={`/${locale}/admin/deals?status=${s}`}>
            {t(`admin.tab.${s}`)} <small>{count(s)}</small>
          </Link>
        ))}
      </div>
      <section className="panel" style={{ marginTop: "var(--s2)" }}><DealReviewTable deals={deals} /></section>
    </div>
  );
}
