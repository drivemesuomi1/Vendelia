import { notFound } from "next/navigation";
import type { AdminDealDTO, AdminMerchantDTO } from "@vendelia/shared";
import { adminConfigured, getAdminSession } from "@/lib/admin-auth";
import { serverApi, serverApiOrNull } from "@/lib/server-api";
import { AdminLogin } from "@/features/admin/components/AdminLogin";
import { StoredBusinessDetail } from "@/features/admin/components/StoredBusinessDetail";

export default async function AdminBusinessPage({ params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminSession()) return <AdminLogin configured={await adminConfigured()} />;
  const { id } = await params;
  const result = await serverApiOrNull<{ merchant: AdminMerchantDTO }>(`/api/admin/merchants/${encodeURIComponent(id)}`);
  if (!result) notFound();
  const { deals } = await serverApi<{ deals: AdminDealDTO[] }>(`/api/admin/deals?status=all&merchantId=${encodeURIComponent(result.merchant.id)}`);
  return <StoredBusinessDetail merchant={result.merchant} deals={deals} />;
}
