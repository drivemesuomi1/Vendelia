import type { Metadata } from "next";
import { getT, resolveLocale } from "@/i18n/server";
import { RegisterForm } from "@/features/auth/components/RegisterForm";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return { title: getT(await resolveLocale(params))("auth.registerTitle"), robots: { index: false } };
}

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <RegisterForm next={next} />;
}
