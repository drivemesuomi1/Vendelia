import { redirect } from "next/navigation";
import { resolveLocale } from "@/i18n/server";
import { SuccessView } from "@/features/checkout/components/SuccessView";

export const metadata = { robots: { index: false } };

export default async function SuccessPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ order?: string }> }) {
  const locale = await resolveLocale(params);
  const { order } = await searchParams;
  if (!order) redirect(`/${locale}`);
  return <SuccessView orderId={order} />;
}
