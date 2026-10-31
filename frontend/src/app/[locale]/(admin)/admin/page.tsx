import { resolveLocale } from "@/i18n/server";
import { AdminDashboard } from "@/features/admin/components/AdminDashboard";
import { buildAdminDemo } from "@/features/admin/mock-data";

/** Admin overview: KPIs, charts and work queues. Uses demo data until the admin API exists. */
export default async function AdminOverviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  const today = new Intl.DateTimeFormat(`${locale}-FI`, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Helsinki" }).format(new Date());
  return <AdminDashboard data={buildAdminDemo()} today={today} />;
}
