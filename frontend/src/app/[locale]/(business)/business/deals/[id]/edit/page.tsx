import { notFound } from "next/navigation";
import type { DealRecordDTO } from "@vendelia/shared";
import { getSession } from "@/lib/session";
import { serverApi, ServerApiError } from "@/lib/server-api";
import { BusinessGate } from "@/features/merchant/components/BusinessGate";
import { MerchantDealEditor } from "@/features/merchant/components/MerchantDashboard";

/** Only the business's own deals load; another business's id is a 404 from the API. */
export default async function EditDealPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (user?.role !== "merchant" || !user.merchant) return <BusinessGate user={null}>{null}</BusinessGate>;
  const { id } = await params;
  const record = await serverApi<{ deal: DealRecordDTO }>(`/api/merchant/deals/${encodeURIComponent(id)}`).catch((e) => {
    if (e instanceof ServerApiError && (e.status === 404 || e.status === 400)) notFound();
    throw e;
  });
  return <MerchantDealEditor record={record.deal} />;
}
