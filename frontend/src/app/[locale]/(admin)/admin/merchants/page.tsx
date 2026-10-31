import type { AdminMerchantRowDTO } from "@vendelia/shared";
import { getT, resolveLocale } from "@/i18n/server";
import { adminData } from "@/lib/admin-api";
import { buildAdminDemo, demoMerchantRows } from "@/features/admin/mock-data";
import { MerchantsTable } from "@/features/admin/components/MerchantsTable";

export default async function AdminMerchantsPage({ params }: { params: Promise<{ locale: string }> }) {
  const t = getT(await resolveLocale(params));
  const { merchants } = await adminData<{ merchants: AdminMerchantRowDTO[] }>("/api/admin/merchants", { merchants: demoMerchantRows(buildAdminDemo()) });
  return (
    <div className="adm">
      <header className="adm-head"><div><h1>{t("admin.merchants")}</h1></div></header>
      <div className="panel"><MerchantsTable merchants={merchants} /></div>
    </div>
  );
}
