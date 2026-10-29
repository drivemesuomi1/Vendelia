import type { AdminMerchantRowDTO } from "@vendelia/shared";
import { getT, resolveLocale } from "@/i18n/server";
import { adminData } from "@/lib/admin-api";
import { MerchantsTable } from "@/features/admin/components/MerchantsTable";

export default async function AdminMerchantsPage({ params }: { params: Promise<{ locale: string }> }) {
  const t = getT(await resolveLocale(params));
  const { merchants } = await adminData<{ merchants: AdminMerchantRowDTO[] }>("/api/admin/merchants", { merchants: [] });
  return (
    <>
      <h1 style={{ fontSize: 28 }}>{t("admin.merchants")}</h1>
      <div className="card" style={{ marginTop: "var(--s3)" }}><MerchantsTable merchants={merchants} /></div>
    </>
  );
}
