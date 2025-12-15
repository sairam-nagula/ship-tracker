// app/api/Kapture/geocode_cache.ts
import fs from "fs/promises";
import path from "path";

export type LatLng = { lat: number; lng: number };

type CacheFile = {
  version: 1;
  updatedAt: string;
  entries: Record<string, LatLng>;
};

const CACHE_DIR = path.join(process.cwd(), "data");
const CACHE_PATH = path.join(CACHE_DIR, "geocode-cache.json");

function keyFor(place: string): string {
  return (place || "").trim().toLowerCase();
}

async function readCache(): Promise<CacheFile> {
  try {
    const raw = await fs.readFile(CACHE_PATH, "utf8");
    const parsed = JSON.parse(raw) as CacheFile;
    if (!parsed || parsed.version !== 1 || typeof parsed.entries !== "object") {
      throw new Error("bad cache shape");
    }
    return parsed;
  } catch {
    return { version: 1, updatedAt: new Date().toISOString(), entries: {} };
  }
}

async function writeCache(cache: CacheFile): Promise<void> {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  cache.updatedAt = new Date().toISOString();
  await fs.writeFile(CACHE_PATH, JSON.stringify(cache, null, 2), "utf8");
}

export async function getCachedLatLng(place: string): Promise<LatLng | null> {
  const k = keyFor(place);
  if (!k) return null;
  const cache = await readCache();
  return cache.entries[k] ?? null;
}

export async function setCachedLatLng(place: string, latlng: LatLng): Promise<void> {
  const k = keyFor(place);
  if (!k) return;
  const cache = await readCache();
  cache.entries[k] = latlng;
  await writeCache(cache);
}