import { adminConfigured, getAdminSession } from "@/lib/admin-auth";
import { AdminLogin } from "@/features/admin/components/AdminLogin";
import { AdminOverview } from "@/features/admin/components/AdminOverview";

/** Admin home: businesses, deal review progress and recent activity. */
export default async function AdminOverviewPage() {
  if (!await getAdminSession()) return <AdminLogin configured={await adminConfigured()} />;
  return <AdminOverview />;
}
