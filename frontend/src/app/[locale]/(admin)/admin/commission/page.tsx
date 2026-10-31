import { adminConfigured, getAdminSession } from "@/lib/admin-auth";
import { AdminLogin } from "@/features/admin/components/AdminLogin";
import { getT, resolveLocale } from "@/i18n/server";
import { adminData } from "@/lib/admin-api";
import { CommissionForm } from "@/features/admin/components/CommissionForm";
import { getMeta } from "@/features/deals/api";

export default async function AdminCommissionPage({ params }: { params: Promise<{ locale: string }> }) {
  if (!await getAdminSession()) return <AdminLogin configured={await adminConfigured()} />;
  const t = getT(await resolveLocale(params));
  const meta = await getMeta();
  const { rateBps } = await adminData<{ rateBps: number }>("/api/admin/settings/commission", { rateBps: meta.commissionBps });
  return (
    <div className="adm">
      <header className="adm-head"><div><h1>{t("admin.commission")}</h1></div></header>
      <CommissionForm rateBps={rateBps} />
    </div>
  );
}
