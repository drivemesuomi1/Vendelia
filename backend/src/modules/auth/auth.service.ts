import { eq } from "drizzle-orm";
import type { LoginInput, RegisterCustomerInput } from "@vendelia/shared";
import type { AppContext } from "../../context";
import { sessions } from "../../db/schema";
import { generateToken } from "../../domain/codes";
import { addDays } from "../../domain/dates";
import { conflict, unauthorized } from "../../domain/errors";
import { hashToken } from "../../middleware/auth";
import { usersRepository } from "../users/users.repository";
import { hashPassword, verifyPassword } from "./password";

export const authService = {
  async registerCustomer(ctx: AppContext, input: RegisterCustomerInput) {
    if (await usersRepository.findByEmail(ctx.db, input.email)) throw conflict("email_taken");
    const user = await usersRepository.create(ctx.db, {
      email: input.email,
      name: input.name,
      role: "customer",
      passwordHash: await hashPassword(input.password),
    });
    return this.createSession(ctx, user.id);
  },

  async login(ctx: AppContext, input: LoginInput) {
    const user = await usersRepository.findByEmail(ctx.db, input.email);
    // Same error for unknown email and wrong password, to avoid account enumeration.
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) throw unauthorized("invalid_credentials");
    return this.createSession(ctx, user.id);
  },

  /** Returns the raw token for the cookie; only its hash is stored. */
  async createSession(ctx: AppContext, userId: string) {
    const token = generateToken();
    const expiresAt = addDays(ctx.now(), ctx.env.SESSION_DAYS);
    await ctx.db.insert(sessions).values({ tokenHash: hashToken(token), userId, expiresAt });
    return { token, expiresAt };
  },

  async logout(ctx: AppContext, token: string | undefined) {
    if (token) await ctx.db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  },
};
