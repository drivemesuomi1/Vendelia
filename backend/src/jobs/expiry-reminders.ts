import { and, eq, isNull } from "drizzle-orm";
import type { AppContext } from "../context";
import { vouchers } from "../db/schema";
import { needsExpiryReminder } from "../domain/voucher-lifecycle";
import { templates } from "../integrations/email/templates";
import { vouchersRepository } from "../modules/vouchers/vouchers.repository";

/** Daily: emails customers whose unused voucher expires within 14 days (once per voucher). */
export async function sendExpiryReminders(ctx: AppContext) {
  const candidates = await ctx.db
    .select({ code: vouchers.code })
    .from(vouchers)
    .where(and(eq(vouchers.status, "active"), isNull(vouchers.reminderSentAt)));
  const sent: string[] = [];
  for (const { code } of candidates) {
    const r = await vouchersRepository.byCode(ctx.db, code);
    if (!r || !needsExpiryReminder(r.voucher, ctx.now())) continue;
    const l = r.orderLocale;
    const mail = templates.expiryReminder({ locale: l, code, title: r.title[l] || r.title.fi, expiresAt: r.voucher.expiresAt });
    await ctx.mailer.send({ to: r.orderEmail, template: "expiryReminder", ...mail });
    sent.push(r.voucher.id);
  }
  await vouchersRepository.setReminderSent(ctx.db, sent, ctx.now());
  return { reminded: sent.length };
}
