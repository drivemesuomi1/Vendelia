import { getT, resolveLocale } from "@/i18n/server";
import { RedeemPanel } from "@/features/merchant/components/RedeemPanel";

export default async function RedeemPage({ params }: { params: Promise<{ locale: string }> }) {
  const t = getT(await resolveLocale(params));
  return (
    <>
      <h1 style={{ fontSize: 28 }}>{t("business.redeem")}</h1>
      <p className="muted" style={{ marginTop: 4 }}>{t("business.redeemIntro")}</p>
      <div style={{ maxWidth: 560, marginTop: "var(--s3)" }}>
        <RedeemPanel />
      </div>
    </>
  );
}
