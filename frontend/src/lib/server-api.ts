import "server-only";
import { cookies } from "next/headers";

const BACKEND = process.env.BACKEND_URL ?? "http://127.0.0.1:4000";

export class ServerApiError extends Error {
  constructor(public readonly status: number, public readonly code: string) {
    super(code);
  }
}

/**
 * Server-component fetch straight to the backend, forwarding the user's cookies
 * so the API sees the same session as the browser.
 */
export async function serverApi<T>(path: string): Promise<T> {
  const jar = await cookies();
  const res = await fetch(`${BACKEND}${path}`, {
    headers: { cookie: jar.toString(), accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ServerApiError(res.status, body.error ?? "internal_error");
  }
  return (await res.json()) as T;
}

/** Same as serverApi but returns null on 404 (for "not found" pages). */
export async function serverApiOrNull<T>(path: string): Promise<T | null> {
  try {
    return await serverApi<T>(path);
  } catch (e) {
    if (e instanceof ServerApiError && e.status === 404) return null;
    throw e;
  }
}
