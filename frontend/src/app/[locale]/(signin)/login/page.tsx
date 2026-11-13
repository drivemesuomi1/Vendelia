import type { Metadata } from "next";
import { getT, resolveLocale } from "@/i18n/server";
import { LoginForm } from "@/features/auth/components/LoginForm";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return { title: getT(await resolveLocale(params))("auth.loginTitle"), robots: { index: false } };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reason?: string; error?: string }> }) {
  const { next, reason, error } = await searchParams;
  return <LoginForm next={next} reason={reason} error={error} />;
}
