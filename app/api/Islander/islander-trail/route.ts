import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getMtnToken } from "@/app/api/MTN/mtn_token";

export type ShipTrackPoint = {
  lat: number;
  lng: number;
  date: string;
  status: string;
  connectedDevices: number | null;
};

// If MTN expects UTC+5, shift safely using milliseconds (no hour overflow).
// If you later confirm MTN expects plain UTC, set this to 0.
const MTN_OFFSET_HOURS = 5;

const TZ = "America/New_York";

// MUST match islander-itinerary cutoff
const SWITCH_CUTOFF_HH = 11;
const SWITCH_CUTOFF_MM = 15;

// Safety caps (tweak if you want)
const MIN_HISTORY_HOURS = 6;
const MAX_HISTORY_HOURS = 24 * 21; // 21 days
const FALLBACK_HISTORY_HOURS = 54;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function parseISODateOnly(iso: string): { y: number; m: number; d: number } | null {
  const m = /^\s*(\d{4})-(\d{2})-(\d{2})\s*$/.exec(iso || "");
  if (!m) return null;
  const yy = Number(m[1]);
  const mm = Number(m[2]);
  const dd = Number(m[3]);
  if (!Number.isFinite(yy) || !Number.isFinite(mm) || !Number.isFinite(dd)) return null;
  return { y: yy, m: mm, d: dd };
}

function getNowNYFull(): { y: number; m: number; d: number; hh: number; mm: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);
  const hh = Number(parts.find((p) => p.type === "hour")?.value);
  const mm = Number(parts.find((p) => p.type === "minute")?.value);

  return { y, m, d, hh, mm };
}

// This defines the "trail start" moment for a sailing:
// sailingStartDateISO at the same cutoff time used to choose the sailing on overlap days.
function sailingStartAtCutoff(iso: string): Date | null {
  const ymd = parseISODateOnly(iso);
  if (!ymd) return null;
  return new Date(ymd.y, ymd.m - 1, ymd.d, SWITCH_CUTOFF_HH, SWITCH_CUTOFF_MM, 0, 0);
}

// Call your islander-itinerary route so we get the *current* sailing (already respects cutoff logic)
async function getDynamicHistoryHours(req: Request): Promise<number> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "https";
    if (!host) return FALLBACK_HISTORY_HOURS;

    const url = `${proto}://${host}/api/Islander/islander-itinerary`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return FALLBACK_HISTORY_HOURS;

    const json = await res.json();
    const startISO =
      typeof json?.sailingStartDateISO === "string" ? json.sailingStartDateISO : null;
    if (!startISO) return FALLBACK_HISTORY_HOURS;

    const start = sailingStartAtCutoff(startISO);
    if (!start) return FALLBACK_HISTORY_HOURS;

    const nowNY = getNowNYFull();
    const now = new Date(nowNY.y, nowNY.m - 1, nowNY.d, nowNY.hh, nowNY.mm, 0, 0);

    const diffMs = now.getTime() - start.getTime();
    const hours = Math.ceil(diffMs / (60 * 60 * 1000));

    return clamp(hours, MIN_HISTORY_HOURS, MAX_HISTORY_HOURS);
  } catch {
    return FALLBACK_HISTORY_HOURS;
  }
}

function formatForMtn(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");

  const shifted = new Date(date.getTime() + MTN_OFFSET_HOURS * 60 * 60 * 1000);

  // Use UTC getters so the string is stable across server timezone changes
  const y = shifted.getUTCFullYear();
  const m = pad(shifted.getUTCMonth() + 1);
  const d = pad(shifted.getUTCDate());
  const hh = pad(shifted.getUTCHours());
  const mm = pad(shifted.getUTCMinutes());
  const ss = pad(shifted.getUTCSeconds());

  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

function buildTrackingUrl(historyHours: number): string {
  const end = new Date();
  const start = new Date(end.getTime() - historyHours * 60 * 60 * 1000);

  const startStr = encodeURIComponent(formatForMtn(start));
  const endStr = encodeURIComponent(formatForMtn(end));

  return `https://customer-api.mtnsat.com/v1/accounts/1327/sites/916/tracking?startDate=${startStr}&endDate=${endStr}`;
}

async function fetchIslanderTrackFromMTN(historyHours: number): Promise<ShipTrackPoint[]> {
  const token = await getMtnToken();
  const url = buildTrackingUrl(historyHours);

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(
      `MTN history API error: ${res.status} ${res.statusText} | body: ${bodyText.slice(0, 500)}`
    );
  }

  const json = await res.json();

  if (!Array.isArray(json)) {
    throw new Error("Expected MTN history endpoint to return an array.");
  }

  const points: ShipTrackPoint[] = json
    .map((row: any) => {
      const lat = Number(row.lat);
      const lng = Number(row.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      return {
        lat,
        lng,
        date: typeof row.date === "string" ? row.date : new Date().toISOString(),
        status: String(row.status ?? ""),
        connectedDevices: row.connected_devices != null ? Number(row.connected_devices) : null,
      };
    })
    .filter((p): p is ShipTrackPoint => p !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  return points;
}

export async function GET(req: Request) {
  try {
    const historyHours = await getDynamicHistoryHours(req);
    const track = await fetchIslanderTrackFromMTN(historyHours);
    return NextResponse.json(track, { status: 200 });
  } catch (error: any) {
    console.error("Error in /api/Islander/islander-trail:", error);
    return NextResponse.json(
      {
        error: "Failed to get Islander ship track",
        details: error?.message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}
