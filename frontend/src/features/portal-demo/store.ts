"use client";

import { useSyncExternalStore } from "react";
import type { DealInput } from "@vendelia/shared";

/**
 * DEMO STORE shared by the admin portal and the business portal until the backend has accounts and
 * merchant deals. Everything lives in this browser's localStorage, so the full flow can be tried:
 * admin creates a business + sign-in -> business signs in, sets its password, submits deals -> admin
 * approves or rejects -> business sees the result. Passwords are stored only as PBKDF2 hashes.
 *
 * Every business also gets an event log (sign-ins, password changes, deal submissions and decisions) and
 * admin notes, which feed the per-business page in the admin portal.
 *
 * Replace with the API (POST /api/admin/merchants, /api/auth/login, /api/merchant/deals,
 * /api/admin/deals/:id/review, GET /api/admin/merchants/:id) when it exists; the shapes below mirror
 * what those endpoints need.
 */

export type BusinessStatus = "active" | "pending" | "suspended";
export type DemoDealStatus = "pending" | "live" | "rejected";

export type EventType =
  | "created"
  | "status"
  | "passwordIssued"
  | "passwordSet"
  | "signIn"
  | "dealSubmitted"
  | "dealResubmitted"
  | "dealApproved"
  | "dealRejected"
  | "dealWithdrawn"
  | "noteAdded"
  | "detailsEdited";

export interface BusinessEvent {
  id: string;
  businessId: string;
  at: string;
  type: EventType;
  /** Deal title, new status, etc. depending on the type. */
  detail: string | null;
  /** Rejection reason for "dealRejected". */
  note: string | null;
}

export interface BusinessNote {
  id: string;
  text: string;
  at: string;
}

export interface DemoBusiness {
  id: string;
  name: string;
  companyName: string;
  businessId: string;
  email: string;
  contactName: string;
  phone: string;
  cityId: string;
  categoryId: string;
  status: BusinessStatus;
  createdAt: string;
  /** "pbkdf2$<iterations>$<salt b64>$<hash b64>" */
  passwordHash: string;
  /** True after the admin issues a password: the business must choose its own on first sign-in. */
  mustChangePassword: boolean;
  lastSignInAt: string | null;
  signInCount: number;
  /** When the business last chose its own password; null while it still has the admin-issued one. */
  passwordChangedAt: string | null;
  /** Internal admin notes, never shown to the business. */
  notes: BusinessNote[];
}

export interface DemoDeal {
  id: string;
  businessId: string;
  input: DealInput;
  status: DemoDealStatus;
  submittedAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
  /** Times the business has (re)submitted this deal. */
  revision: number;
}

interface State {
  businesses: DemoBusiness[];
  deals: DemoDeal[];
  events: BusinessEvent[];
}

const KEY = "vd_demo_portal_v1";
const SESSION = "vd_demo_business_session";
const EVENT = "vd-demo-store";
const EMPTY: State = { businesses: [], deals: [], events: [] };
const MAX_EVENTS = 1000;

/** Fills fields added after the first version so older saved data keeps working. */
function normalize(p: Partial<State>): State {
  return {
    businesses: (p.businesses ?? []).map((b) => ({ ...b, lastSignInAt: b.lastSignInAt ?? null, signInCount: b.signInCount ?? 0, passwordChangedAt: b.passwordChangedAt ?? null, notes: b.notes ?? [] })),
    deals: p.deals ?? [],
    events: p.events ?? [],
  };
}

let cacheRaw: string | null = null;
let cache: State = EMPTY;

function read(): State {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return cache;
  }
  if (raw === cacheRaw) return cache;
  cacheRaw = raw;
  try {
    cache = raw ? normalize(JSON.parse(raw) as Partial<State>) : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}

function write(next: State) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Quota or private mode: keep in memory for this tab.
    cacheRaw = null;
    cache = next;
  }
  window.dispatchEvent(new Event(EVENT));
}

function update(fn: (s: State) => State) {
  write(fn(read()));
}

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => (e.key === KEY || e.key === SESSION) && cb();
  window.addEventListener("storage", onStorage); // other tabs
  window.addEventListener(EVENT, cb); // this tab
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT, cb);
  };
}

/** Whole demo state; empty during server rendering and hydration. */
export function useDemoStore(): State {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

/** False while hydrating, so screens can avoid flashing "empty" or "signed out". */
export function useHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const evt = (businessId: string, type: EventType, detail: string | null = null, note: string | null = null): BusinessEvent => ({
  id: uid("ev"),
  businessId,
  at: new Date().toISOString(),
  type,
  detail,
  note,
});
const withEvents = (s: State, ...e: BusinessEvent[]): State => ({ ...s, events: [...e, ...s.events].slice(0, MAX_EVENTS) });
const patchBusiness = (s: State, id: string, patch: Partial<DemoBusiness>): State => ({ ...s, businesses: s.businesses.map((b) => (b.id === id ? { ...b, ...patch } : b)) });

/* ---------- Passwords (Web Crypto PBKDF2-SHA-256) ---------- */

const ITERATIONS = 150_000;
const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  return crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations }, key, 256);
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITERATIONS}$${b64(salt)}$${b64(await derive(password, salt, ITERATIONS))}`;
}

async function verifyPassword(password: string, stored: string) {
  const [algo, it, salt, hash] = stored.split("$");
  if (algo !== "pbkdf2" || !it || !salt || !hash) return false;
  const actual = new Uint8Array(await derive(password, unb64(salt), Number(it)));
  const expected = unb64(hash);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i]! ^ expected[i]!;
  return diff === 0;
}

/* ---------- Businesses (admin) ---------- */

export type NewBusiness = Omit<DemoBusiness, "id" | "createdAt" | "passwordHash" | "mustChangePassword" | "lastSignInAt" | "signInCount" | "passwordChangedAt" | "notes">;

export async function createBusiness(data: NewBusiness, password: string) {
  const business: DemoBusiness = {
    ...data,
    id: uid("biz"),
    createdAt: new Date().toISOString(),
    passwordHash: await hashPassword(password),
    mustChangePassword: true,
    lastSignInAt: null,
    signInCount: 0,
    passwordChangedAt: null,
    notes: [],
  };
  update((s) => withEvents({ ...s, businesses: [business, ...s.businesses] }, evt(business.id, "created")));
  return business;
}

export function setBusinessStatus(id: string, status: BusinessStatus) {
  update((s) => withEvents(patchBusiness(s, id, { status }), evt(id, "status", status)));
}

export type BusinessDetails = Pick<DemoBusiness, "name" | "companyName" | "contactName" | "phone" | "cityId" | "categoryId">;

export function updateBusiness(id: string, details: BusinessDetails) {
  update((s) => withEvents(patchBusiness(s, id, details), evt(id, "detailsEdited")));
}

/** Admin-issued password: the business must replace it at its next sign-in. */
export async function resetBusinessPassword(id: string, password: string) {
  const passwordHash = await hashPassword(password);
  update((s) => withEvents(patchBusiness(s, id, { passwordHash, mustChangePassword: true, passwordChangedAt: null }), evt(id, "passwordIssued")));
}

export function addBusinessNote(id: string, text: string) {
  const note: BusinessNote = { id: uid("note"), text: text.trim(), at: new Date().toISOString() };
  if (!note.text) return;
  update((s) => withEvents(patchBusiness(s, id, { notes: [note, ...(s.businesses.find((b) => b.id === id)?.notes ?? [])] }), evt(id, "noteAdded")));
}

export function removeBusinessNote(id: string, noteId: string) {
  update((s) => patchBusiness(s, id, { notes: (s.businesses.find((b) => b.id === id)?.notes ?? []).filter((n) => n.id !== noteId) }));
}

export function removeBusiness(id: string) {
  update((s) => ({ businesses: s.businesses.filter((b) => b.id !== id), deals: s.deals.filter((d) => d.businessId !== id), events: s.events.filter((e) => e.businessId !== id) }));
  if (getSessionId() === id) signOutBusiness();
}

/* ---------- Business session ---------- */

function getSessionId() {
  try {
    return localStorage.getItem(SESSION);
  } catch {
    return null;
  }
}

export function useBusinessSession(): DemoBusiness | null {
  const state = useDemoStore();
  const id = useSyncExternalStore(subscribe, getSessionId, () => null);
  return state.businesses.find((b) => b.id === id) ?? null;
}

export async function signInBusiness(email: string, password: string): Promise<DemoBusiness | null> {
  const business = read().businesses.find((b) => b.email === email.trim().toLowerCase());
  const ok = business ? await verifyPassword(password, business.passwordHash) : await hashPassword(password).then(() => false);
  if (!business || !ok) return null;
  update((s) =>
    withEvents(patchBusiness(s, business.id, { lastSignInAt: new Date().toISOString(), signInCount: (s.businesses.find((b) => b.id === business.id)?.signInCount ?? 0) + 1 }), evt(business.id, "signIn")),
  );
  try {
    localStorage.setItem(SESSION, business.id);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVENT));
  return business;
}

export function signOutBusiness() {
  try {
    localStorage.removeItem(SESSION);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Business chooses its own password (first sign-in or later). */
export async function changeOwnPassword(id: string, password: string) {
  const passwordHash = await hashPassword(password);
  update((s) => withEvents(patchBusiness(s, id, { passwordHash, mustChangePassword: false, passwordChangedAt: new Date().toISOString() }), evt(id, "passwordSet")));
}

/* ---------- Deals ---------- */

export function submitDeal(businessId: string, input: DealInput) {
  const deal: DemoDeal = { id: uid("deal"), businessId, input, status: "pending", submittedAt: new Date().toISOString(), reviewedAt: null, reviewNote: null, revision: 1 };
  update((s) => withEvents({ ...s, deals: [deal, ...s.deals] }, evt(businessId, "dealSubmitted", input.title.fi)));
  return deal;
}

/** Any edit sends the deal back to review, even if it was live. */
export function resubmitDeal(id: string, input: DealInput) {
  update((s) => {
    const current = s.deals.find((d) => d.id === id);
    const next = {
      ...s,
      deals: s.deals.map((d) => (d.id === id ? { ...d, input, status: "pending" as const, submittedAt: new Date().toISOString(), reviewNote: null, revision: d.revision + 1 } : d)),
    };
    return current ? withEvents(next, evt(current.businessId, "dealResubmitted", input.title.fi)) : next;
  });
}

export function withdrawDeal(id: string) {
  update((s) => {
    const current = s.deals.find((d) => d.id === id);
    const next = { ...s, deals: s.deals.filter((d) => d.id !== id) };
    return current ? withEvents(next, evt(current.businessId, "dealWithdrawn", current.input.title.fi)) : next;
  });
}

export function reviewDeal(id: string, decision: "approve" | "reject", note?: string) {
  update((s) => {
    const current = s.deals.find((d) => d.id === id);
    const reason = decision === "reject" ? note?.trim() || null : null;
    const next = {
      ...s,
      deals: s.deals.map((d) => (d.id === id ? { ...d, status: decision === "approve" ? ("live" as const) : ("rejected" as const), reviewedAt: new Date().toISOString(), reviewNote: reason } : d)),
    };
    return current ? withEvents(next, evt(current.businessId, decision === "approve" ? "dealApproved" : "dealRejected", current.input.title.fi, reason)) : next;
  });
}
