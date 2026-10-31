import { getT, resolveLocale } from "@/i18n/server";
import { FinanceView } from "@/features/admin/components/FinanceView";
import { buildAdminDemo } from "@/features/admin/mock-data";

export default async function AdminFinancePage({ params }: { params: Promise<{ locale: string }> }) {
  const t = getT(await resolveLocale(params));
  return (
    <div className="adm">
      <header className="adm-head"><div><h1>{t("admin.finance.title")}</h1><p className="muted small">{t("admin.financeSub")}</p></div></header>
      <FinanceView data={buildAdminDemo()} />
    </div>
  );
}
