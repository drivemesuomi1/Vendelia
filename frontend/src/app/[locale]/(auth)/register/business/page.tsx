import type { Metadata } from "next";
import { getT, resolveLocale } from "@/i18n/server";
import { BusinessRegisterForm } from "@/features/auth/components/BusinessRegisterForm";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return { title: getT(await resolveLocale(params))("auth.businessTitle") };
}

export default function BusinessRegisterPage() {
  return <BusinessRegisterForm />;
}
