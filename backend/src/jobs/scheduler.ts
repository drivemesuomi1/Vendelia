import type { AppContext } from "../context";
import { buildDac7Report } from "./dac7-report";
import { sendExpiryReminders } from "./expiry-reminders";
import { runPayouts } from "./payout-run";
import { expireVouchers } from "./voucher-expiry";

export const JOBS = {
  "voucher-expiry": expireVouchers,
  "expiry-reminders": sendExpiryReminders,
  "payout-run": runPayouts,
  "dac7-report": buildDac7Report,
} as const;
export type JobName = keyof typeof JOBS;

const HOUR = 3_600_000;

/**
 * Minimal in-process scheduler for a single API instance.
 * With several instances, move these to a queue (pg-boss / Inngest) so each runs once.
 */
export function startScheduler(ctx: AppContext) {
  const run = async (name: JobName) => {
    try {
      const result = await JOBS[name](ctx);
      ctx.log.info({ job: name, result }, "job finished");
    } catch (err) {
      ctx.log.error({ job: name, err }, "job failed");
    }
  };
  const timers = [
    setInterval(() => void run("voucher-expiry"), 6 * HOUR),
    setInterval(() => void run("expiry-reminders"), 24 * HOUR),
  ];
  // Run the cheap housekeeping jobs once at startup. Payouts and DAC7 are triggered from admin or cron.
  void run("voucher-expiry");
  void run("expiry-reminders");
  return () => timers.forEach(clearInterval);
}
