import type { Metadata } from "next";
import { resolveLocale } from "@/i18n/server";
import { TERMS } from "@/features/legal/content";
import { LegalPage } from "@/features/legal/LegalPage";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return { title: TERMS[await resolveLocale(params)].title };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  return <LegalPage doc={TERMS[await resolveLocale(params)]} />;
}
