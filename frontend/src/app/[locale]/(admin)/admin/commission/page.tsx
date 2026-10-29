import { getT, resolveLocale } from "@/i18n/server";
import { serverApi } from "@/lib/server-api";
import { CommissionForm } from "@/features/admin/components/CommissionForm";

export default async function AdminCommissionPage({ params }: { params: Promise<{ locale: string }> }) {
  const t = getT(await resolveLocale(params));
  const { rateBps } = await serverApi<{ rateBps: number }>("/api/admin/settings/commission");
  return (
    <>
      <h1 style={{ fontSize: 28, marginBottom: "var(--s3)" }}>{t("admin.commission")}</h1>
      <CommissionForm rateBps={rateBps} />
    </>
  );
}
