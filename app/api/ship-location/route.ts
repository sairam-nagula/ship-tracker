import { NextResponse } from "next/server";

type ShipLocation = {
  name: string;
  lat: number;
  lng: number;
  lastUpdated: string;

  // extra fields we care about for the UI
  speedKts: number | null;
  courseDeg: number | 270;
  headingDeg: number | null;
};

// Fetch the latest vessel location from MTN and map it into our internal ShipLocation format.
async function fetchShipFromMtnsat(): Promise<ShipLocation> {
  // You can hard-code this, or put it in an env var like MTNSAT_URL
  const url =
    process.env.MTNSAT_URL ||
    "https://customer-api.mtnsat.com/v1/accounts/1327/sites/916";

  const token = process.env.MTNSAT_TOKEN; // put your Bearer token in .env

  if (!token) {
    throw new Error("MTNSAT_TOKEN is not set in environment variables.");
  }

  const res = await fetch(url, {
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

  const data = await res.json();

  // Example fields from your screenshot:
  // latitude, longitude, speed, location_updated_at, azimuth, site_name, account_name, etc.
  const lat = Number(data.latitude);
  const lng = Number(data.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error(
      `Invalid coordinates from MTN (lat=${data.latitude}, lng=${data.longitude}).`
    );
  }

  const ts: string =
    typeof data.location_updated_at === "string"
      ? data.location_updated_at
      : new Date().toISOString();

  const speedKts =
    data.speed !== undefined && data.speed !== null
      ? Number(data.speed)
      : null;

  const azimuth =
    data.azimuth !== undefined && data.azimuth !== null
      ? Number(data.azimuth)
      : null;

  const courseDeg = azimuth ?? null;
  const headingDeg = azimuth ?? null;

  const fallbackName = process.env.SHIP_NAME || "Cruise Ship";
  const name =
    (typeof data.site_name === "string" && data.site_name.trim().length > 0
      ? data.site_name
      : typeof data.account_name === "string" &&
        data.account_name.trim().length > 0
      ? data.account_name
      : fallbackName) || fallbackName;

  return {
    name,
    lat,
    lng,
    lastUpdated: ts,
    speedKts,
    courseDeg,
    headingDeg,
  };
}

export async function GET() {
  try {
    const shipData = await fetchShipFromMtnsat();
    return NextResponse.json(shipData, { status: 200 });
  } catch (error: any) {
    console.error("Error in /api/ship-location:", error);
    return NextResponse.json(
      {
        error: "Failed to get ship location",
        details: error?.message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}
