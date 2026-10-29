import type { Metadata } from "next";
import { getT, resolveLocale } from "@/i18n/server";
import { CartView } from "@/features/cart/components/CartView";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return { title: getT(await resolveLocale(params))("cart.title"), robots: { index: false } };
}

export default function CartPage() {
  return <CartView />;
}
