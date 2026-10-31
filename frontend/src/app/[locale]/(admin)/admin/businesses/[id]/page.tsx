import { adminConfigured, getAdminSession } from "@/lib/admin-auth";
import { AdminLogin } from "@/features/admin/components/AdminLogin";
import { BusinessDetail } from "@/features/admin/components/BusinessDetail";

/** One business in full: profile, sign-in details, deals, activity log and admin notes. */
export default async function AdminBusinessPage({ params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminSession()) return <AdminLogin configured={await adminConfigured()} />;
  const { id } = await params;
  return <BusinessDetail id={id} />;
}
