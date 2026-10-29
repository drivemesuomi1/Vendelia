"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminConfig } from "@/lib/admin-auth";
import { ADMIN_COOKIE, ADMIN_SESSION_SECONDS, signToken, verifyPassword } from "@/lib/admin-token";

export interface AdminLoginState {
  error?: "invalid" | "notConfigured";
}

// Used so a wrong email costs the same time as a wrong password.
const DUMMY_HASH = "scrypt$AAAAAAAAAAAAAAAAAAAAAA==$" + "A".repeat(86) + "==";

export async function adminLogin(_prev: AdminLoginState | null, formData: FormData): Promise<AdminLoginState> {
  const cfg = adminConfig();
  if (!cfg) return { error: "notConfigured" };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const passwordOk = await verifyPassword(password, email === cfg.email ? cfg.passwordHash : DUMMY_HASH);
  await new Promise((r) => setTimeout(r, 400)); // slows down guessing
  if (email !== cfg.email || !passwordOk) return { error: "invalid" };

  (await cookies()).set(ADMIN_COOKIE, signToken(cfg.email, cfg.secret), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_SECONDS,
  });
  redirect("/admin");
}

export async function adminLogout() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin");
}
