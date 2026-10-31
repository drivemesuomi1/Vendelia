import "server-only";
import { serverApi } from "./server-api";

/** True when the backend answers its health check. */
export async function isApiUp(): Promise<boolean> {
  try {
    await serverApi("/api/health");
    return true;
  } catch {
    return false;
  }
}

/** Fetches admin data; without a reachable backend returns the fallback so the screen still renders (empty). */
export async function adminData<T>(path: string, fallback: T): Promise<T> {
  try {
    return await serverApi<T>(path);
  } catch {
    return fallback;
  }
}
