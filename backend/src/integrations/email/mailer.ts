import type { FastifyBaseLogger } from "fastify";
import type { Db } from "../../db/client";
import { emailOutbox } from "../../db/schema";

export interface Mailer {
  send(msg: { to: string; subject: string; body: string; template: string }): Promise<void>;
}

/**
 * Development mailer: records every email in the email_outbox table and logs it.
 * Swap for a Postmark/Resend adapter with the same interface in production.
 */
export function createOutboxMailer(db: Db, log: FastifyBaseLogger, from: string): Mailer {
  return {
    async send(msg) {
      await db.insert(emailOutbox).values(msg);
      log.info({ to: msg.to, subject: msg.subject, from }, "email queued (outbox)");
    },
  };
}
