import { NextResponse } from "next/server";
import { getMtnToken } from "@/app/api/MTN/mtn_token";   // ✅ NEW IMPORT

type ShipLocation = {
  name: string;
  lat: number;
  lng: number;
  lastUpdated: string;
  speedKts: number | null;
  courseDeg: number | null;
};

const MTN_URL =
  "https://customer-api.mtnsat.com/v1/sites?page=1&with_usage=0&limit=10000";

export async function fetchIslanderFromMTN(): Promise<ShipLocation> {

  const token = await getMtnToken();

  const res = await fetch(MTN_URL, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`MTN API error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();

  const islanderRow = (json.rows as any[]).find(
    (row) => row.site_name === "MAS Islander"
  );

  if (!islanderRow) {
    throw new Error("MAS Islander not found in MTN site list.");
  }

  const lat = Number(islanderRow.latitude);
  const lng = Number(islanderRow.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error(
      `Invalid coordinates for Islander (lat=${islanderRow.latitude}, lng=${islanderRow.longitude})`
    );
  }

  const speedKts =
    islanderRow.speed !== undefined && islanderRow.speed !== null
      ? Number(islanderRow.speed)
      : null;

  const azimuth =
    islanderRow.azimuth !== undefined && islanderRow.azimuth !== null
      ? Number(islanderRow.azimuth)
      : null;

  const ts: string =
    typeof islanderRow.location_updated_at === "string"
      ? islanderRow.location_updated_at
      : new Date().toISOString();

  const name =
    typeof islanderRow.site_name === "string" && islanderRow.site_name.trim()
      ? islanderRow.site_name
      : "MAS Islander";

  return {
    name,
    lat,
    lng,
    lastUpdated: ts,
    speedKts,
    courseDeg: azimuth ?? null,
  };
}

export async function GET() {
  try {
    const shipLocation = await fetchIslanderFromMTN();
    return NextResponse.json(shipLocation, { status: 200 });
  } catch (error: any) {
    console.error("Error in /api/Islander/islander-ship-location:", error);
    return NextResponse.json(
      {
        error: "Failed to get Islander ship location",
        details: error?.message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}
