import "server-only";
import { cookies } from "next/headers";
import { backendRequest } from "./backend-request";

export class ServerApiError extends Error {
  constructor(public readonly status: number, public readonly code: string) {
    super(code);
  }
}

/**
 * Server components use the same backend as /api, forwarding the user's cookies.
 * With no BACKEND_URL, the Fastify app runs inside the Next.js Node runtime.
 */
export async function serverApi<T>(path: string): Promise<T> {
  const jar = await cookies();
  const res = await backendRequest(path, {
    headers: { cookie: jar.toString(), accept: "application/json" },
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
