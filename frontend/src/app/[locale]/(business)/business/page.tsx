import type { MerchantDealCardDTO } from "@vendelia/shared";
import { getSession } from "@/lib/session";
import { serverApi } from "@/lib/server-api";
import { BusinessGate } from "@/features/merchant/components/BusinessGate";
import { MerchantDashboard } from "@/features/merchant/components/MerchantDashboard";

export default async function BusinessHomePage() {
  const user = await getSession();
  if (user?.role !== "merchant" || !user.merchant) return <BusinessGate user={null}>{null}</BusinessGate>;
  const { deals } = await serverApi<{ deals: MerchantDealCardDTO[] }>("/api/merchant/deal-cards");
  return <MerchantDashboard merchant={user.merchant} deals={deals} />;
}
