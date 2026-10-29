import type { Metadata } from "next";
import type { VoucherDTO } from "@vendelia/shared";
import { getT, resolveLocale } from "@/i18n/server";
import { serverApi } from "@/lib/server-api";
import { requireSession } from "@/lib/session";
import { VoucherList } from "@/features/vouchers/components/VoucherList";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return { title: getT(await resolveLocale(params))("nav.myVouchers"), robots: { index: false } };
}

export default async function MyVouchersPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  const user = await requireSession(locale, `/${locale}/account/vouchers`);
  const { vouchers } = await serverApi<{ vouchers: VoucherDTO[] }>("/api/me/vouchers");
  const t = getT(locale);
  return (
    <main className="wrap" style={{ paddingTop: "var(--s4)", maxWidth: 960 }}>
      <h1 style={{ fontSize: "clamp(26px,4vw,34px)" }}>{t("nav.myVouchers")}</h1>
      <VoucherList initial={vouchers} email={user.email} />
    </main>
  );
}
