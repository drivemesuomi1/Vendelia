"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { formatDate } from "@/lib/format";
import { runJob } from "../api";

interface Email { id: string; to: string; subject: string; body: string; template: string; createdAt: string }
interface Audit { id: string; action: string; entity: string; entityId: string; createdAt: string }

const JOBS = ["voucher-expiry", "expiry-reminders", "payout-run", "dac7-report"] as const;

/** Background jobs on demand, the sent-email outbox and the audit log. */
export function SupportTools({ emails, audit }: { emails: Email[]; audit: Audit[] }) {
  const { t, locale } = useI18n();
  const [output, setOutput] = useState<string | null>(null);

  return (
    <div className="stack">
      <div className="card pad stack">
        <h2 style={{ fontSize: 18 }}>{t("admin.jobs")}</h2>
        <div className="row wrap-row">
          {JOBS.map((j) => (
            <button key={j} className="btn btn-secondary btn-sm" onClick={async () => setOutput(JSON.stringify((await runJob(j)).result, null, 2))}>
              {t(`admin.job.${j}`)}
            </button>
          ))}
        </div>
        {output && <pre className="mono small" style={{ background: "var(--soft)", padding: 12, borderRadius: 8, overflowX: "auto" }}>{output}</pre>}
      </div>
      <div className="card">
        <div className="pad"><h2 style={{ fontSize: 18 }}>{t("admin.outbox")}</h2><p className="hint">{t("admin.outboxHint")}</p></div>
        <div className="table-wrap">
          <table className="tbl-compact">
            <thead><tr><th>{t("admin.sentAt")}</th><th>{t("admin.to")}</th><th>{t("admin.subject")}</th></tr></thead>
            <tbody>
              {emails.map((e) => (
                <tr key={e.id}>
                  <td>{formatDate(e.createdAt, locale)}</td><td>{e.to}</td>
                  <td><details><summary>{e.subject}</summary><pre className="small" style={{ whiteSpace: "pre-wrap" }}>{e.body}</pre></details></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card">
        <div className="pad"><h2 style={{ fontSize: 18 }}>{t("admin.audit")}</h2></div>
        <div className="table-wrap">
          <table className="tbl-compact">
            <tbody>
              {audit.map((a) => (
                <tr key={a.id}><td>{formatDate(a.createdAt, locale)}</td><td className="mono small">{a.action}</td><td className="small">{a.entity} {a.entityId.slice(0, 8)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
