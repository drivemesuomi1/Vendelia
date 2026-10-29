import { notFound } from "next/navigation";
import type { DealDetailDTO } from "@vendelia/shared";
import { getT, resolveLocale } from "@/i18n/server";
import { serverApiOrNull } from "@/lib/server-api";
import { DealForm } from "@/features/merchant/components/DealForm";

export default async function EditDealPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { id } = await params;
  const t = getT(await resolveLocale(params));
  const deal = await serverApiOrNull<DealDetailDTO & { merchantId: string }>(`/api/merchant/deals/${encodeURIComponent(id)}`);
  if (!deal) notFound();
  return (
    <>
      <h1 style={{ fontSize: 28 }}>{t("business.editDeal")}</h1>
      <p className="muted" style={{ marginTop: 4 }}>{t("business.editNote")}</p>
      <DealForm deal={deal} />
    </>
  );
}
