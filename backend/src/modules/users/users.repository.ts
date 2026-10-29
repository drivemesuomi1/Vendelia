import { eq } from "drizzle-orm";
import type { Role } from "@vendelia/shared";
import type { DbOrTx } from "../../db/client";
import { users } from "../../db/schema";

export const usersRepository = {
  async findByEmail(db: DbOrTx, email: string) {
    const [row] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    return row ?? null;
  },

  async create(db: DbOrTx, input: { email: string; passwordHash: string; name: string; role: Role; merchantId?: string | null }) {
    const [row] = await db
      .insert(users)
      .values({ ...input, email: input.email.toLowerCase() })
      .returning();
    return row!;
  },

  async updateName(db: DbOrTx, id: string, name: string) {
    await db.update(users).set({ name }).where(eq(users.id, id));
  },
};
