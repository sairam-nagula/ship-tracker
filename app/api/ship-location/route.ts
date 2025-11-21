import { NextResponse } from "next/server";

type ShipLocation = {
  name: string;
  lat: number;
  lng: number;
  lastUpdated: string;

  // extra fields we care about for the UI, still in progress
  speedKts: number | null;
  courseDeg: number | 270;
  headingDeg: number | null;
};

// Fetch the latest vessel location from Marinesia and map it into our internal ShipLocation format.
async function fetchShipFromMarinesia(): Promise<ShipLocation> {
  const apiKey = process.env.MARINESIA_API_KEY || "";
  const baseUrl = process.env.MARINESIA_BASE_URL || "https://api.marinesia.com";
  const mmsi = process.env.MARINESIA_MMSI;
  const fallbackName = process.env.SHIP_NAME || "Cruise Ship";

  if (!mmsi) {
    throw new Error("MARINESIA_MMSI is not set in environment variables.");
  }

  // Build URL: /api/v1/vessel/{mmsi}/location/latest?key=API_KEY
  const url = new URL(`/api/v1/vessel/${mmsi}/location/latest`, baseUrl);

  // According to docs, API key is passed as query parameter
  if (apiKey) {
    url.searchParams.set("key", apiKey);
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Marinesia API error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();

  const data = json.data ?? {};

  const lat = Number(data.lat);
  const lng = Number(data.lng);
  
  const ts: string =
    typeof data.ts === "string" ? data.ts : new Date().toISOString();

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error(
      `Invalid coordinates from Marinesia (lat=${data.lat}, lng=${data.lng}).`
    );
  }

  // pull speed and angles if they exist; otherwise null
  const speedKts =
    typeof data.speed === "number"
      ? data.speed
      : typeof data.sog === "number"
      ? data.sog
      : null;

  const courseDeg =
    typeof data.course === "number"
      ? data.course
      : typeof data.cog === "number"
      ? data.cog
      : null;

  const headingDeg =
    typeof data.heading === "number" ? data.heading : courseDeg;

  const name =
    typeof data.name === "string" && data.name.trim().length > 0
      ? data.name
      : `${fallbackName} (MMSI ${data.mmsi ?? mmsi})`;

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
    const shipData = await fetchShipFromMarinesia();
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
