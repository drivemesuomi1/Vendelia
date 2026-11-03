import { notFound } from "next/navigation";
import type { AdminDealDTO } from "@vendelia/shared";
import { adminConfigured, getAdminSession } from "@/lib/admin-auth";
import { serverApi, ServerApiError } from "@/lib/server-api";
import { AdminLogin } from "@/features/admin/components/AdminLogin";
import { DealReviewPage } from "@/features/admin/components/DealReviewPage";

export default async function AdminDealReviewPage({ params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminSession()) return <AdminLogin configured={await adminConfigured()} />;
  const { id } = await params;
  const result = await serverApi<{ deal: AdminDealDTO }>(`/api/admin/deals/${encodeURIComponent(id)}`).catch((e) => {
    if (e instanceof ServerApiError && (e.status === 404 || e.status === 400)) notFound();
    throw e;
  });
  return <DealReviewPage deal={result.deal} />;
}
