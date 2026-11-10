import type { Metadata } from "next";
import { getT, resolveLocale } from "@/i18n/server";
import { BusinessApplyForm } from "@/features/auth/components/BusinessApplyForm";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return { title: getT(await resolveLocale(params))("auth.businessTitle") };
}

/** Businesses apply by email; Vendelia checks them and creates their sign-in details. */
export default function BusinessApplyPage() {
  return <BusinessApplyForm />;
}
