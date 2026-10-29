import type { Metadata } from "next";
import { getT, resolveLocale } from "@/i18n/server";
import { CheckoutForm } from "@/features/checkout/components/CheckoutForm";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return { title: getT(await resolveLocale(params))("checkout.title"), robots: { index: false } };
}

export default function CheckoutPage() {
  return <CheckoutForm />;
}
