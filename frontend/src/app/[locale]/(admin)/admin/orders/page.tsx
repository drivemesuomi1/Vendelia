import { getT, resolveLocale } from "@/i18n/server";
import { OrdersTable } from "@/features/admin/components/OrdersTable";
import { buildAdminDemo } from "@/features/admin/mock-data";

export default async function AdminOrdersPage({ params }: { params: Promise<{ locale: string }> }) {
  const t = getT(await resolveLocale(params));
  return (
    <div className="adm">
      <header className="adm-head"><div><h1>{t("admin.orders")}</h1><p className="muted small">{t("admin.ordersSub")}</p></div></header>
      <OrdersTable data={buildAdminDemo()} />
    </div>
  );
}
