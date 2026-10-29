import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/**
 * Stop-gap admin sign-in used while there is no backend: one admin identity from environment variables and an
 * HMAC-signed, expiring cookie. Pure functions here (no Next.js imports) so they can be unit-tested.
 * Replace with real backend sessions when the API exists.
 */
const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, keylen: number) => Promise<Buffer>;
const KEYLEN = 64;

export const ADMIN_COOKIE = "vd_admin";
export const ADMIN_SESSION_SECONDS = 8 * 60 * 60;

/** Hash format: scrypt$<salt b64>$<hash b64> (same as the backend reference implementation). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEYLEN);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, saltB64, hashB64] = stored.split("$");
  if (algo !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const b64 = (s: string | Buffer) => Buffer.from(s).toString("base64url");
const sign = (payload: string, secret: string) => createHmac("sha256", secret).update(payload).digest("base64url");

export function signToken(email: string, secret: string, now = Date.now(), ttlSeconds = ADMIN_SESSION_SECONDS): string {
  const payload = b64(JSON.stringify({ email, exp: Math.floor(now / 1000) + ttlSeconds }));
  return `${payload}.${sign(payload, secret)}`;
}

/** Returns the admin email if the token is authentic, unexpired and for the expected admin; otherwise null. */
export function verifyToken(token: string | undefined, secret: string, expectedEmail: string, now = Date.now()): string | null {
  if (!token || !secret) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const good = Buffer.from(sign(payload, secret));
  const given = Buffer.from(sig);
  if (good.length !== given.length || !timingSafeEqual(good, given)) return null;
  try {
    const { email, exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { email?: string; exp?: number };
    if (!email || !exp || exp * 1000 < now || email !== expectedEmail) return null;
    return email;
  } catch {
    return null;
  }
}
