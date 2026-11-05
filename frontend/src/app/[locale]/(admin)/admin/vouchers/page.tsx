import { adminConfigured, getAdminSession } from "@/lib/admin-auth";
import { AdminLogin } from "@/features/admin/components/AdminLogin";
import { getT, resolveLocale } from "@/i18n/server";
import { AdminVouchers } from "@/features/admin/components/AdminVouchers";

/** Look up any voucher by code, and browse the latest bought and used vouchers. */
export default async function AdminVouchersPage({ params }: { params: Promise<{ locale: string }> }) {
  if (!await getAdminSession()) return <AdminLogin configured={await adminConfigured()} />;
  const t = getT(await resolveLocale(params));
  return (
    <div className="adm">
      <header className="adm-head"><div><h1>{t("admin.vouchers")}</h1><p className="muted small">{t("admin.vouchersSub")}</p></div></header>
      <AdminVouchers />
    </div>
  );
}
