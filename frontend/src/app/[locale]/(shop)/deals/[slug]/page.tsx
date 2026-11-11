import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveLocale } from "@/i18n/server";
import { loc } from "@/lib/format";
import { getDeal } from "@/features/deals/api";
import { DealDetail } from "@/features/deals/components/DealDetail";
import { geocodeAddress } from "@/features/deals/geocode";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const locale = await resolveLocale(params);
  const deal = await getDeal(slug);
  if (!deal) return {};
  return {
    title: loc(deal.title, locale),
    description: loc(deal.description, locale),
    openGraph: { title: loc(deal.title, locale), description: loc(deal.description, locale), images: [deal.imageUrl] },
  };
}

export default async function DealPage({ params }: Props) {
  const { slug } = await params;
  const deal = await getDeal(slug);
  if (!deal) notFound();
  // Every deal with a street address gets a map, including services done at the customer's place.
  const city = deal.cityId.charAt(0).toUpperCase() + deal.cityId.slice(1);
  const mapPoint = await geocodeAddress(deal.street, deal.zip, city);
  return <DealDetail deal={deal} mapPoint={mapPoint} />;
}
