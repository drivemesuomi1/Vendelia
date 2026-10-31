import { mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import nodemailer from "nodemailer";
import type { OrderConfig } from "../../config";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments: { filename: string; content: Uint8Array; contentType: string }[];
}

export interface Mailer {
  /** Resolves with where the message went (SMTP message id or outbox file); rejects if it could not be sent. */
  send(message: MailMessage): Promise<{ id: string }>;
}

export class MailNotConfiguredError extends Error {
  constructor() { super("Email is not configured: set SMTP_HOST (and SMTP_USER/SMTP_PASS)"); }
}

/** SMTP when configured; otherwise a local .eml outbox in development; otherwise an error. */
export function createMailer(config: OrderConfig["mail"]): Mailer {
  const envelope = (message: MailMessage) => ({
    from: config.from, replyTo: config.replyTo, to: message.to, subject: message.subject,
    text: message.text, html: message.html,
    attachments: message.attachments.map((a) => ({ filename: a.filename, content: Buffer.from(a.content), contentType: a.contentType })),
  });

  if (config.smtp) {
    const { host, port, secure, user, pass } = config.smtp;
    const transport = nodemailer.createTransport({
      host, port, secure, auth: user ? { user, pass } : undefined,
      connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000,
    });
    return { async send(message) { return { id: (await transport.sendMail(envelope(message))).messageId }; } };
  }

  if (config.outboxDir) {
    // Relative to the backend folder, so root, workspace and Next dev commands share one outbox.
    const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
    const dir = isAbsolute(config.outboxDir) ? config.outboxDir : resolve(backendRoot, config.outboxDir);
    const transport = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: "unix" });
    return {
      async send(message) {
        const info = await transport.sendMail(envelope(message));
        await mkdir(dir, { recursive: true });
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        const base = resolve(dir, `${stamp}-${message.to.replace(/[^a-z0-9@._-]/gi, "_")}`);
        await writeFile(`${base}.eml`, info.message as Buffer);
        // The PDFs are also saved next to the .eml so they can be opened directly.
        await Promise.all(message.attachments.map((a) => writeFile(`${base}-${a.filename}`, a.content)));
        return { id: `${base}.eml` };
      },
    };
  }

  return { async send() { throw new MailNotConfiguredError(); } };
}
