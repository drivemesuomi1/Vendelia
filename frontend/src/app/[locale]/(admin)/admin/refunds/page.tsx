import type { AdminRefundRowDTO } from "@vendelia/shared";
import { getT, resolveLocale } from "@/i18n/server";
import { adminData } from "@/lib/admin-api";
import { RefundsPanel } from "@/features/admin/components/RefundsPanel";

export default async function AdminRefundsPage({ params }: { params: Promise<{ locale: string }> }) {
  const t = getT(await resolveLocale(params));
  const { refunds } = await adminData<{ refunds: AdminRefundRowDTO[] }>("/api/admin/refunds", { refunds: [] });
  return (
    <>
      <h1 style={{ fontSize: 28, marginBottom: "var(--s3)" }}>{t("admin.refunds")}</h1>
      <RefundsPanel refunds={refunds} />
    </>
  );
}
