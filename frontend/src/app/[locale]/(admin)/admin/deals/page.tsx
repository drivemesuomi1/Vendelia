import { adminConfigured, getAdminSession } from "@/lib/admin-auth";
import { AdminLogin } from "@/features/admin/components/AdminLogin";
import { getT, resolveLocale } from "@/i18n/server";
import { DealReviewQueue } from "@/features/admin/components/DealReviewQueue";

/** Deals submitted by businesses, pending first: approve to publish or reject with a reason. */
export default async function AdminDealsPage({ params }: { params: Promise<{ locale: string }> }) {
  if (!await getAdminSession()) return <AdminLogin configured={await adminConfigured()} />;
  const t = getT(await resolveLocale(params));
  return (
    <div className="adm">
      <header className="adm-head"><div><h1>{t("admin.deals")}</h1><p className="muted small">{t("admin.dealsSub")}</p></div></header>
      <DealReviewQueue />
    </div>
  );
}
