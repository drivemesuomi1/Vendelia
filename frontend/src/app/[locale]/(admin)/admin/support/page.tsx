import { getT, resolveLocale } from "@/i18n/server";
import { adminData } from "@/lib/admin-api";
import { buildAdminDemo, demoSupport } from "@/features/admin/mock-data";
import { SupportTools } from "@/features/admin/components/SupportTools";

export default async function AdminSupportPage({ params }: { params: Promise<{ locale: string }> }) {
  const t = getT(await resolveLocale(params));
  const demo = demoSupport(buildAdminDemo());
  const [{ emails }, { entries }] = await Promise.all([
    adminData<{ emails: { id: string; to: string; subject: string; body: string; template: string; createdAt: string }[] }>("/api/admin/emails", { emails: demo.emails }),
    adminData<{ entries: { id: string; action: string; entity: string; entityId: string; createdAt: string }[] }>("/api/admin/audit", { entries: demo.entries }),
  ]);
  return (
    <div className="adm">
      <header className="adm-head"><div><h1>{t("admin.support")}</h1></div></header>
      <SupportTools emails={emails} audit={entries} />
    </div>
  );
}
