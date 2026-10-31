import { adminConfigured, getAdminSession } from "@/lib/admin-auth";
import { AdminLogin } from "@/features/admin/components/AdminLogin";
import { getT, resolveLocale } from "@/i18n/server";
import { FinanceView } from "@/features/admin/components/FinanceView";
import { buildAdminDemo } from "@/features/admin/mock-data";

export default async function AdminFinancePage({ params }: { params: Promise<{ locale: string }> }) {
  if (!await getAdminSession()) return <AdminLogin configured={await adminConfigured()} />;
  const t = getT(await resolveLocale(params));
  return (
    <div className="adm">
      <header className="adm-head"><div><h1>{t("admin.finance.title")}</h1><p className="muted small">{t("admin.financeSub")}</p></div></header>
      <FinanceView data={buildAdminDemo()} />
    </div>
  );
}
