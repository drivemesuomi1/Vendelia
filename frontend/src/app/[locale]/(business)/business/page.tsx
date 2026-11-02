import type { MerchantDealDTO, SessionUserDTO } from "@vendelia/shared";
import { getSession } from "@/lib/session";
import { serverApi } from "@/lib/server-api";
import { BusinessGate } from "@/features/merchant/components/BusinessGate";
import { MerchantDashboard } from "@/features/merchant/components/MerchantDashboard";

export default async function BusinessHomePage() {
  const user = await getSession();
  if (user?.role !== "merchant" || !user.merchant) return <BusinessGate user={null}>{null}</BusinessGate>;
  const data = await serverApi<{ merchant: NonNullable<SessionUserDTO["merchant"]>; deals: MerchantDealDTO[] }>("/api/merchant/deals");
  return <MerchantDashboard merchant={data.merchant} deals={data.deals} />;
}
