import type { PayoutStatementDTO } from "@vendelia/shared";
import { getT, resolveLocale } from "@/i18n/server";
import { serverApi } from "@/lib/server-api";
import { getSession } from "@/lib/session";
import { PayoutStatement } from "@/features/merchant/components/PayoutStatement";

export default async function PayoutsPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  const user = await getSession();
  if (!user?.merchant) return <p className="muted">{getT(locale)("business.adminNoMerchant")}</p>;
  const data = await serverApi<PayoutStatementDTO>("/api/merchant/payouts");
  return <PayoutStatement data={data} />;
}
