import { getT, resolveLocale } from "@/i18n/server";
import { DealForm } from "@/features/merchant/components/DealForm";

export default async function NewDealPage({ params }: { params: Promise<{ locale: string }> }) {
  const t = getT(await resolveLocale(params));
  return (
    <>
      <h1 style={{ fontSize: 28 }}>{t("business.createDeal")}</h1>
      <p className="muted" style={{ marginTop: 4 }}>{t("business.reviewNote")}</p>
      <DealForm />
    </>
  );
}
