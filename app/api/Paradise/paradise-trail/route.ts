import { NextResponse } from "next/server";
import { getMtnToken } from "@/app/api/MTN/mtn_token";

export type ShipTrackPoint = {
  lat: number;
  lng: number;
  date: string;
  status: string;
  connectedDevices: number | null;
};

// How many hours of history you want from MTN
const HISTORY_HOURS = 24;

function formatForMtn(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");

  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours() + 5);
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());

  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

function buildTrackingUrl(): string {
  const end = new Date();
  const start = new Date(end.getTime() - HISTORY_HOURS * 60 * 60 * 1000);

  const startStr = encodeURIComponent(formatForMtn(start));
  const endStr = encodeURIComponent(formatForMtn(end));

  return `https://customer-api.mtnsat.com/v1/accounts/1328/sites/850/tracking?startDate=${startStr}&endDate=${endStr}`;
}

async function fetchParadiseTrackFromMTN(): Promise<ShipTrackPoint[]> {
  const token = await getMtnToken();

  const url = buildTrackingUrl();

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`MTN history API error: ${res.status} ${res.statusText}`);
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
        connectedDevices:
          row.connected_devices != null ? Number(row.connected_devices) : null,
      };
    })
    .filter((p): p is ShipTrackPoint => p !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  return points;
}

export async function GET() {
  try {
    const track = await fetchParadiseTrackFromMTN();
    return NextResponse.json(track, { status: 200 });
  } catch (error: any) {
    console.error("Error in /api/Paradise/paradise-track:", error);
    return NextResponse.json(
      {
        error: "Failed to get Paradise ship track",
        details: error?.message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}
