import { getSession } from "@/lib/session";
import { BusinessGate } from "@/features/merchant/components/BusinessGate";
import { MerchantFeaturePending } from "@/features/merchant/components/MerchantDashboard";

export default async function NewDealPage() {
  const user = await getSession();
  if (user?.role !== "merchant" || !user.merchant) return <BusinessGate user={null}>{null}</BusinessGate>;
  return <MerchantFeaturePending />;
}
