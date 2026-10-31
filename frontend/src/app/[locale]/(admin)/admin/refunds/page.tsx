import type { AdminRefundRowDTO } from "@vendelia/shared";
import { getT, resolveLocale } from "@/i18n/server";
import { adminData } from "@/lib/admin-api";
import { buildAdminDemo, demoRefundRows } from "@/features/admin/mock-data";
import { RefundsPanel } from "@/features/admin/components/RefundsPanel";

export default async function AdminRefundsPage({ params }: { params: Promise<{ locale: string }> }) {
  const t = getT(await resolveLocale(params));
  const { refunds } = await adminData<{ refunds: AdminRefundRowDTO[] }>("/api/admin/refunds", { refunds: demoRefundRows(buildAdminDemo()) });
  return (
    <div className="adm">
      <header className="adm-head"><div><h1>{t("admin.refunds")}</h1></div></header>
      <RefundsPanel refunds={refunds} />
    </div>
  );
}
