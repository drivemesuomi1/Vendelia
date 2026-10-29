import type { MerchantOverviewDTO } from "@vendelia/shared";
import { getT, resolveLocale } from "@/i18n/server";
import { serverApi } from "@/lib/server-api";
import { getSession } from "@/lib/session";
import { OverviewView } from "@/features/merchant/components/OverviewView";

export default async function BusinessOverviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  const user = await getSession();
  if (!user?.merchant) return <p className="muted">{getT(locale)("business.adminNoMerchant")}</p>;
  const data = await serverApi<MerchantOverviewDTO>("/api/merchant/overview");
  return <OverviewView data={data} user={user} />;
}
