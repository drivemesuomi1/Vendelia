import { eq } from "drizzle-orm";
import type { DbOrTx } from "../../db/client";
import { settings } from "../../db/schema";
import { DEFAULT_COMMISSION_BPS } from "../../domain/commission";

const COMMISSION_KEY = "commission_bps";

export const settingsRepository = {
  async getCommissionBps(db: DbOrTx): Promise<number> {
    const [row] = await db.select().from(settings).where(eq(settings.key, COMMISSION_KEY)).limit(1);
    return typeof row?.value === "number" ? row.value : DEFAULT_COMMISSION_BPS;
  },

  async setCommissionBps(db: DbOrTx, bps: number) {
    await db
      .insert(settings)
      .values({ key: COMMISSION_KEY, value: bps })
      .onConflictDoUpdate({ target: settings.key, set: { value: bps } });
  },
};
