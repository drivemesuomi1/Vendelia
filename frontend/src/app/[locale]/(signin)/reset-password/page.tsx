import type { Metadata } from "next";
import { getT, resolveLocale } from "@/i18n/server";
import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return { title: getT(await resolveLocale(params))("auth.resetTitle"), robots: { index: false } };
}

/** Opened from the password reset email: ?u=<user id>&t=<token>. */
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ u?: string; t?: string }> }) {
  const { u, t } = await searchParams;
  return <ResetPasswordForm id={u ?? ""} token={t ?? ""} />;
}
