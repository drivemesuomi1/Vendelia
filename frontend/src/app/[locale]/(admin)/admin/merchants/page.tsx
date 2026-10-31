import type { AdminMerchantRowDTO } from "@vendelia/shared";
import { getT, resolveLocale } from "@/i18n/server";
import { adminData } from "@/lib/admin-api";
import { buildAdminDemo, demoMerchantRows } from "@/features/admin/mock-data";
import { ManageBusinesses } from "@/features/admin/components/ManageBusinesses";

export default async function AdminMerchantsPage({ params }: { params: Promise<{ locale: string }> }) {
  const t = getT(await resolveLocale(params));
  const { merchants } = await adminData<{ merchants: AdminMerchantRowDTO[] }>("/api/admin/merchants", { merchants: demoMerchantRows(buildAdminDemo()) });
  return (
    <div className="adm">
      <header className="adm-head"><div><h1>{t("admin.mb.title")}</h1><p className="muted small">{t("admin.mb.sub")}</p></div></header>
      <ManageBusinesses merchants={merchants} />
    </div>
  );
}
