"use client";

import type { ApiErrorDTO } from "@vendelia/shared";

/** Error thrown for non-2xx API responses; `code` and `fields` are translation keys. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly fields: Record<string, string> = {},
  ) {
    super(code);
  }
}

/** Browser-side fetch to the same-origin /api (proxied to the backend by next.config). */
export async function api<T>(path: string, init: { method?: string; body?: unknown; headers?: Record<string, string>; locale?: string } = {}): Promise<T> {
  const isForm = typeof FormData !== "undefined" && init.body instanceof FormData;
  const res = await fetch(path, {
    method: init.method ?? (init.body ? "POST" : "GET"),
    credentials: "same-origin",
    headers: {
      ...(init.body && !isForm ? { "content-type": "application/json" } : {}),
      ...(init.locale ? { "x-locale": init.locale } : {}),
      ...init.headers,
    },
    body: init.body ? (isForm ? (init.body as FormData) : JSON.stringify(init.body)) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = (data ?? {}) as Partial<ApiErrorDTO>;
    throw new ApiError(res.status, err.error ?? "internal_error", err.fields ?? {});
  }
  return data as T;
}
