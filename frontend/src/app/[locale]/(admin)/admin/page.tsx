import type { AdminMerchantDTO } from "@vendelia/shared";
import { serverApi } from "@/lib/server-api";
import { adminConfigured, getAdminSession } from "@/lib/admin-auth";
import { AdminLogin } from "@/features/admin/components/AdminLogin";
import { AdminOverview } from "@/features/admin/components/AdminOverview";

/** Admin home: businesses, deal review progress and recent activity. */
export default async function AdminOverviewPage() {
  if (!await getAdminSession()) return <AdminLogin configured={await adminConfigured()} />;
  const { merchants } = await serverApi<{ merchants: AdminMerchantDTO[] }>("/api/admin/merchants");
  return <AdminOverview businesses={merchants} />;
}
