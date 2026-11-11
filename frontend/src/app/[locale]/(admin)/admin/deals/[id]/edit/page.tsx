import { notFound } from "next/navigation";
import type { AdminDealDTO } from "@vendelia/shared";
import { adminConfigured, getAdminSession } from "@/lib/admin-auth";
import { serverApi, ServerApiError } from "@/lib/server-api";
import { AdminLogin } from "@/features/admin/components/AdminLogin";
import { AdminDealEditor } from "@/features/admin/components/AdminDealEditor";

/** Admins can edit any business's deal; the deal keeps its status. */
export default async function AdminDealEditPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string }> }) {
  if (!await getAdminSession()) return <AdminLogin configured={await adminConfigured()} />;
  const { id } = await params;
  const { from } = await searchParams;
  const result = await serverApi<{ deal: AdminDealDTO }>(`/api/admin/deals/${encodeURIComponent(id)}`).catch((e) => {
    if (e instanceof ServerApiError && (e.status === 404 || e.status === 400)) notFound();
    throw e;
  });
  return <AdminDealEditor deal={result.deal} fromBusiness={from === "business"} />;
}
