import type { Metadata } from "next";
import type { VoucherDTO } from "@vendelia/shared";
import { getT, resolveLocale } from "@/i18n/server";
import { serverApi } from "@/lib/server-api";
import { getSession } from "@/lib/session";
import { AccountPortal } from "@/features/vouchers/components/AccountPortal";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return { title: getT(await resolveLocale(params))("account.title.overview"), robots: { index: false } };
}

/** Customer account: overview. The layout has already checked the session. */
export default async function AccountOverviewPage() {
  const user = (await getSession())!;
  const { vouchers } = await serverApi<{ vouchers: VoucherDTO[] }>("/api/me/vouchers");
  return <AccountPortal section="overview" user={{ name: user.name, email: user.email }} initial={vouchers} />;
}
