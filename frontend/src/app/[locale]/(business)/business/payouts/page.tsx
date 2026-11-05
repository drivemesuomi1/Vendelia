import { getSession } from '@/lib/session';
import { BusinessGate } from '@/features/merchant/components/BusinessGate';
import { MerchantPayouts } from '@/features/merchant/components/MerchantPayouts';

export default async function BusinessPayoutsPage() {
  const user = await getSession();
  if (user?.role !== 'merchant' || !user.merchant) return <BusinessGate user={null}>{null}</BusinessGate>;
  return <MerchantPayouts />;
}
