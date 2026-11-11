import "server-only";
import { cache } from "react";

export interface MapPoint { lat: number; lon: number }

const NOMINATIM = "https://nominatim.openstreetmap.org/search";

async function search(params: Record<string, string>): Promise<MapPoint | null> {
  const query = new URLSearchParams({ ...params, countrycodes: "fi", format: "jsonv2", limit: "1" });
  const res = await fetch(`${NOMINATIM}?${query}`, {
    headers: { "User-Agent": "Vendelia/1.0 (+https://www.vendelia.fi)", "Accept-Language": "fi" },
    next: { revalidate: 60 * 60 * 24 * 30 },
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) return null;
  const [hit] = (await res.json()) as { lat: string; lon: string }[];
  if (!hit) return null;
  const point = { lat: Number(hit.lat), lon: Number(hit.lon) };
  return Number.isFinite(point.lat) && Number.isFinite(point.lon) ? point : null;
}

/**
 * Street address to coordinates through OpenStreetMap's Nominatim, for the deal page map.
 * Runs on the server only and is cached for 30 days per address, which keeps us well inside
 * Nominatim's usage policy (max 1 request/second, identified client). Any failure returns null
 * and the page shows the address without a map.
 *
 * Businesses sometimes type the whole address into the street field ("Kuunsäde 3a, LT 1, 02210 Espoo"),
 * so only the part before the first comma is used as the street, matched by postcode rather than
 * by city (the deal's city can differ from the street's, e.g. a Helsinki deal from an Espoo address).
 */
export const geocodeAddress = cache(async (street: string, zip: string, city: string): Promise<MapPoint | null> => {
  const firstPart = street.split(",")[0]!.trim();
  if (!firstPart) return null;
  try {
    return (zip ? await search({ street: firstPart, postalcode: zip }) : null)
      ?? await search({ q: [firstPart, zip, city].filter(Boolean).join(", ") });
  } catch {
    return null;
  }
});
