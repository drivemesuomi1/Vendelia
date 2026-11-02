import { getT, resolveLocale } from "@/i18n/server";
import { getSession } from "@/lib/session";
import { BusinessGate } from "@/features/merchant/components/BusinessGate";
import { RedeemPanel } from "@/features/merchant/components/RedeemPanel";

export default async function RedeemPage({ params }: { params: Promise<{ locale: string }> }) {
  const user = await getSession();
  if (user?.role !== "merchant" || !user.merchant) return <BusinessGate user={null}>{null}</BusinessGate>;
  const t = getT(await resolveLocale(params));
  return <><h1>{t("business.redeem")}</h1><p className="review-note">{t("business.redemptionPreview")}</p><div style={{ maxWidth: 560 }}><RedeemPanel /></div></>;
}
