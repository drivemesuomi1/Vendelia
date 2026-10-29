import { randomBytes, randomInt } from "node:crypto";

/** No 0/O/1/I to avoid misreading at the till. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Voucher code like VND-7KQ2-M8XT (32^8 ≈ 1.1e12 combinations). */
export function generateVoucherCode(): string {
  let s = "";
  for (let i = 0; i < 8; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `VND-${s.slice(0, 4)}-${s.slice(4)}`;
}

export function generateOrderNumber(): string {
  return `VD-${randomInt(100000, 999999)}`;
}

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
