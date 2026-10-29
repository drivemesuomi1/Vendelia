import { desc } from "drizzle-orm";
import type { DbOrTx } from "../../db/client";
import { auditLog } from "../../db/schema";

export const auditService = {
  async record(db: DbOrTx, entry: { actorId: string | null; action: string; entity: string; entityId: string; data?: unknown }) {
    await db.insert(auditLog).values({ ...entry, data: entry.data ?? null });
  },

  async latest(db: DbOrTx, limit = 100) {
    return db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(limit);
  },
};
