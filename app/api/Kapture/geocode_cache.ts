// app/api/Kapture/geocode_cache.ts
import { kv } from "@vercel/kv";

export type LatLng = {
  lat: number;
  lng: number;
};

function normalizeKey(place: string): string {
  return place.trim().toLowerCase();
}

const PREFIX = "geocode:";

export async function getCachedLatLng(place: string): Promise<LatLng | null> {
  if (!place) return null;

  const key = PREFIX + normalizeKey(place);

  try {
    const value = await kv.get<LatLng>(key);
    if (!value) return null;

    if (
      typeof value.lat !== "number" ||
      typeof value.lng !== "number"
    ) {
      return null;
    }

    return value;
  } catch (err) {
    console.error("[geocode_cache] KV get failed", err);
    return null;
  }
}

export async function setCachedLatLng(
  place: string,
  latlng: LatLng
): Promise<void> {
  if (!place) return;

  const key = PREFIX + normalizeKey(place);

  try {
    // Store permanently (no TTL)
    await kv.set(key, latlng);
  } catch (err) {
    console.error("[geocode_cache] KV set failed", err);
  }
}
