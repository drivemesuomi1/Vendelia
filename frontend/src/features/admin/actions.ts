"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { backendRequest } from "@/lib/backend-request";

export interface AdminLoginState { error?: "invalid" | "notConfigured" | "unavailable" | "tooManyAttempts" }

export async function adminLogin(_prev: AdminLoginState | null, formData: FormData): Promise<AdminLoginState> {
  const body = new TextEncoder().encode(JSON.stringify({
    email: String(formData.get("email") ?? ""), password: String(formData.get("password") ?? ""),
  }));
  let response: Response;
  try {
    response = await backendRequest("/api/auth/admin/login", {
      method: "POST", headers: { "content-type": "application/json", cookie: (await cookies()).toString() },
      body: body.buffer,
    });
  } catch { return { error: "unavailable" }; }
  if (!response.ok) return { error: response.status === 429 ? "tooManyAttempts" : response.status >= 500 ? "unavailable" : "invalid" };
  const token = /(?:^|;)\s*vd_session=([a-f0-9]{64})(?:;|$)/.exec(response.headers.get("set-cookie") ?? "")?.[1];
  if (!token) return { error: "unavailable" };
  (await cookies()).set("vd_session", token, {
    httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 8 * 60 * 60,
  });
  (await cookies()).delete("vd_admin");
  redirect("/admin");
}

export async function adminLogout() {
  const jar = await cookies();
  // A failed database operation must not be reported as successful server revocation.
  const response = await backendRequest("/api/auth/logout", { method: "POST", headers: { cookie: jar.toString() } });
  if (!response.ok) throw new Error("Sign out could not be completed. Please try again.");
  jar.delete("vd_session"); jar.delete("vd_admin");
  redirect("/admin");
}
