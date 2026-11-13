import type { Metadata } from "next";
import { getT, resolveLocale } from "@/i18n/server";
import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return { title: getT(await resolveLocale(params))("auth.forgotTitle"), robots: { index: false } };
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
