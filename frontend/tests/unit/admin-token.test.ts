import { describe, expect, it } from "vitest";
import { hashPassword, signToken, verifyPassword, verifyToken } from "../../src/lib/admin-token";

const SECRET = "test-secret-test-secret-test-secret";

describe("admin password", () => {
  it("accepts the right password and rejects wrong ones", async () => {
    const h = await hashPassword("correct horse battery");
    expect(await verifyPassword("correct horse battery", h)).toBe(true);
    expect(await verifyPassword("wrong password!!", h)).toBe(false);
    expect(await verifyPassword("x", "not-a-hash")).toBe(false);
  });
});

describe("admin session token", () => {
  const now = Date.UTC(2026, 9, 29, 12);
  it("round-trips for the right admin", () => {
    expect(verifyToken(signToken("a@x.fi", SECRET, now), SECRET, "a@x.fi", now + 1000)).toBe("a@x.fi");
  });
  it("rejects tampering, wrong secret, other admin and expiry", () => {
    const t = signToken("a@x.fi", SECRET, now);
    const [p, s] = t.split(".");
    expect(verifyToken(`${p}x.${s}`, SECRET, "a@x.fi", now)).toBeNull();
    expect(verifyToken(t, "another-secret-another-secret-12", "a@x.fi", now)).toBeNull();
    expect(verifyToken(t, SECRET, "b@x.fi", now)).toBeNull();
    expect(verifyToken(t, SECRET, "a@x.fi", now + 9 * 3600 * 1000)).toBeNull();
    expect(verifyToken(undefined, SECRET, "a@x.fi", now)).toBeNull();
    expect(verifyToken("garbage", SECRET, "a@x.fi", now)).toBeNull();
  });
});
