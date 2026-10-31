import { adminConfigured, getAdminSession } from "@/lib/admin-auth";
import { AdminLogin } from "@/features/admin/components/AdminLogin";
import { getT, resolveLocale } from "@/i18n/server";
import { ManageBusinesses } from "@/features/admin/components/ManageBusinesses";

/** Admin home: businesses and their sign-in details. */
export default async function AdminBusinessesPage({ params }: { params: Promise<{ locale: string }> }) {
  if (!await getAdminSession()) return <AdminLogin configured={await adminConfigured()} />;
  const t = getT(await resolveLocale(params));
  return (
    <div className="adm">
      <header className="adm-head"><div><h1>{t("admin.mb.title")}</h1><p className="muted small">{t("admin.mb.sub")}</p></div></header>
      <ManageBusinesses />
    </div>
  );
}
