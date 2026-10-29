import { getT, resolveLocale } from "@/i18n/server";
import { serverApi } from "@/lib/server-api";
import { SupportTools } from "@/features/admin/components/SupportTools";

export default async function AdminSupportPage({ params }: { params: Promise<{ locale: string }> }) {
  const t = getT(await resolveLocale(params));
  const [{ emails }, { entries }] = await Promise.all([
    serverApi<{ emails: { id: string; to: string; subject: string; body: string; template: string; createdAt: string }[] }>("/api/admin/emails"),
    serverApi<{ entries: { id: string; action: string; entity: string; entityId: string; createdAt: string }[] }>("/api/admin/audit"),
  ]);
  return (
    <>
      <h1 style={{ fontSize: 28, marginBottom: "var(--s3)" }}>{t("admin.support")}</h1>
      <SupportTools emails={emails} audit={entries} />
    </>
  );
}
