/** Process liveness only: safe for frequent container probes without contacting Supabase. */
export const dynamic = "force-dynamic";
export function GET() {
  return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
