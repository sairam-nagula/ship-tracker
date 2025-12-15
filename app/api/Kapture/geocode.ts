// app/api/Kapture/geocode.ts
import { getCachedLatLng, setCachedLatLng, type LatLng } from "./geocode_cache";

function isAtSeaLike(port: string): boolean {
  const p = (port || "").toLowerCase();
  return (
    p.includes("at sea") ||
    p.includes("sea day") ||
    p.includes("cruising") ||
    p.includes("sailing")
  );
}

export async function geocodePlace(place: string): Promise<LatLng | null> {
  const cleaned = (place || "").trim();
  if (!cleaned) return null;
  if (isAtSeaLike(cleaned)) return null;

  const cached = await getCachedLatLng(cleaned);
  if (cached) return cached;

  const key = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return null;

  const url =
    "https://maps.googleapis.com/maps/api/geocode/json?" +
    new URLSearchParams({
      address: cleaned,
      key,
    }).toString();

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;

  const json = (await res.json()) as any;
  if (!json || json.status !== "OK" || !Array.isArray(json.results) || !json.results[0]) {
    return null;
  }

  const loc = json.results[0]?.geometry?.location;
  const lat = Number(loc?.lat);
  const lng = Number(loc?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const latlng = { lat, lng };
  await setCachedLatLng(cleaned, latlng);
  return latlng;
}