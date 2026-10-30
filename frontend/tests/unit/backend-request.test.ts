import { afterEach, beforeEach, expect, it, vi } from "vitest";

const { inject, ready, buildApp } = vi.hoisted(() => {
  const inject = vi.fn();
  const ready = vi.fn().mockResolvedValue(undefined);
  return { inject, ready, buildApp: vi.fn(() => ({ inject, ready })) };
});
vi.mock("server-only", () => ({}));
vi.mock("@vendelia/backend/app", () => ({ buildApp }));
vi.mock("@vendelia/backend/db", () => ({ sql: {} }));

function response(statusCode = 200, headers: Record<string, string | string[]> = {}) {
  return { statusCode, rawPayload: Buffer.from('{"deals":[]}'), headers: { "content-type": "application/json", ...headers } };
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv("BACKEND_URL", "");
  inject.mockResolvedValue(response());
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it("runs the API in-process without BACKEND_URL and reuses the warm app", async () => {
  const { backendRequest } = await import("../../src/lib/backend-request");
  const first = await backendRequest("/api/deals");
  const second = await backendRequest("/api/meta");
  expect(await first.json()).toEqual({ deals: [] });
  expect(second.status).toBe(200);
  expect(buildApp).toHaveBeenCalledTimes(1);
  expect(ready).toHaveBeenCalledTimes(1);
});

it("forwards API query, cookies, locale and JSON body into Fastify", async () => {
  const { handleApiRequest } = await import("../../src/lib/backend-request");
  const body = { items: [{ dealId: "example", optionId: "option", qty: 2 }] };
  const result = await handleApiRequest(new Request("https://www.vendelia.fi/api/cart/quote?test=1", {
    method: "POST", headers: { "content-type": "application/json", cookie: "vd_session=example", "x-locale": "en" },
    body: JSON.stringify(body),
  }));
  expect(result.status).toBe(200);
  expect(result.headers.get("cache-control")).toBe("no-store");
  const options = inject.mock.calls[0]![0];
  expect(options.url).toBe("/api/cart/quote?test=1");
  expect(options.method).toBe("POST");
  expect(options.headers.cookie).toBe("vd_session=example");
  expect(options.headers["x-locale"]).toBe("en");
  expect(JSON.parse(options.payload.toString())).toEqual(body);
});

it("preserves status and multiple cookies while removing transport encoding headers", async () => {
  inject.mockResolvedValue(response(404, {
    "set-cookie": ["first=1; HttpOnly", "second=2; HttpOnly"],
    "content-length": "12", "content-encoding": "gzip",
  }));
  const { handleApiRequest } = await import("../../src/lib/backend-request");
  const result = await handleApiRequest(new Request("https://www.vendelia.fi/api/unknown"));
  expect(result.status).toBe(404);
  expect(result.headers.getSetCookie()).toEqual(["first=1; HttpOnly", "second=2; HttpOnly"]);
  expect(result.headers.has("content-encoding")).toBe(false);
  expect(result.headers.has("content-length")).toBe(false);
});

it("supports a separately hosted API when BACKEND_URL is explicitly configured", async () => {
  vi.stubEnv("BACKEND_URL", "https://api.example.com/");
  const fetcher = vi.fn().mockResolvedValue(Response.json({ cities: [] }));
  vi.stubGlobal("fetch", fetcher);
  const { backendRequest } = await import("../../src/lib/backend-request");
  const result = await backendRequest("/api/meta", { headers: { cookie: "session=example" } });
  expect(await result.json()).toEqual({ cities: [] });
  expect(fetcher).toHaveBeenCalledWith("https://api.example.com/api/meta", expect.objectContaining({ cache: "no-store" }));
  expect(buildApp).not.toHaveBeenCalled();
});

it("returns a generic 503 for initialization failure, without exposing DB details", async () => {
  buildApp.mockImplementationOnce(() => { throw new Error("private database failure"); });
  vi.spyOn(console, "error").mockImplementation(() => {});
  const { handleApiRequest } = await import("../../src/lib/backend-request");
  const result = await handleApiRequest(new Request("https://www.vendelia.fi/api/meta"));
  expect(result.status).toBe(503);
  expect(await result.text()).not.toContain("private database failure");
});

it("rejects oversized request bodies before starting the database-backed app", async () => {
  const { handleApiRequest } = await import("../../src/lib/backend-request");
  const result = await handleApiRequest(new Request("https://www.vendelia.fi/api/cart/quote", {
    method: "POST", body: "x".repeat(1024 * 1024 + 1),
  }));
  expect(result.status).toBe(413);
  expect(buildApp).not.toHaveBeenCalled();
});

it("rejects a frontend BACKEND_URL instead of recursively proxying to itself", async () => {
  vi.stubEnv("BACKEND_URL", "https://www.vendelia.fi");
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  vi.spyOn(console, "error").mockImplementation(() => {});
  const { handleApiRequest } = await import("../../src/lib/backend-request");
  const result = await handleApiRequest(new Request("https://www.vendelia.fi/api/meta"));
  expect(result.status).toBe(503);
  expect(fetcher).not.toHaveBeenCalled();
});
