import type { Metadata } from "next";
import { getT, resolveLocale } from "@/i18n/server";
import { requireSession } from "@/lib/session";
import { CheckoutForm } from "@/features/checkout/components/CheckoutForm";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return { title: getT(await resolveLocale(params))("checkout.title"), robots: { index: false } };
}

/** Checkout needs a signed-in account; anyone else signs in first and comes back here. */
export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  await requireSession(locale, `/${locale}/checkout`);
  return <CheckoutForm />;
}
