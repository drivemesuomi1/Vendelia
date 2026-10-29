"use client";

import type { VoucherDTO } from "@vendelia/shared";
import { Icon } from "@/components/ui/Icon";
import { useI18n } from "@/i18n/I18nProvider";
import { formatDate } from "@/lib/format";

/** Status chip: colour + icon + text, so status never relies on colour alone. */
export function VoucherStatus({ v }: { v: VoucherDTO }) {
  const { t, locale } = useI18n();
  if (v.status === "redeemed") return <span className="chip grey"><Icon name="check" />{t("vouchers.used", { date: formatDate(v.redeemedAt!, locale) })}</span>;
  if (v.status === "refunded") return <span className="chip danger"><Icon name="refund" />{t("vouchers.refunded")}</span>;
  if (v.status === "expired") return <span className="chip grey"><Icon name="clock" />{t("vouchers.expired")}</span>;
  const days = Math.ceil((new Date(v.expiresAt).getTime() - Date.now()) / 86_400_000);
  return days <= 14 ? (
    <span className="chip warn"><Icon name="clock" />{t("vouchers.expiresIn", { n: days })}</span>
  ) : (
    <span className="chip teal"><Icon name="checkc" />{t("vouchers.valid")}</span>
  );
}
