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

type MtnSitesResponse = {
  total: number;
  rows: MtnSiteRow[];
};

type MtnSiteRow = {
  site_id: number;
  site_name: string;
  account_id: number;
  account_name: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  location_updated_at: string;
  azimuth?: number | null;
  // ...we don’t need the rest for now
};

const MTN_URL =
  "https://customer-api.mtnsat.com/v1/sites?page=1&with_usage=0&limit=10000";

// Fetch the latest vessel location from MTN /sites and map it into our internal ShipLocation format.
async function fetchShipFromMtnsat(): Promise<ShipLocation> {
  const token = process.env.MTNSAT_TOKEN;
  if (!token) {
    throw new Error("MTNSAT_TOKEN is not set in environment variables.");
  }

  const url = MTN_URL;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json, text/plain, */*",
      "sec-ch-ua-platform": '"Windows"',
      Referer: "https://customer.fmcglobalsat.com/",
      "sec-ch-ua":
        '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
      "sec-ch-ua-mobile": "?0",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `MTN /sites API error: ${res.status} ${res.statusText} ${text}`
    );
  }

  const data = (await res.json()) as MtnSitesResponse;

  if (!data || !Array.isArray(data.rows) || data.rows.length === 0) {
    throw new Error("MTN /sites API returned no rows.");
  }

  // Use MAS Islander only for now (site_id 916 or name "MAS Islander")
  const islander =
    data.rows.find((row) => row.site_id === 916) ||
    data.rows.find((row) => row.site_name === "MAS Islander");

  if (!islander) {
    throw new Error("MAS Islander site not found in MTN /sites response.");
  }

  const lat = Number(islander.latitude);
  const lng = Number(islander.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error(
      `Invalid coordinates from MTN (lat=${islander.latitude}, lng=${islander.longitude}).`
    );
  }

  const ts =
    typeof islander.location_updated_at === "string" &&
    islander.location_updated_at.length > 0
      ? islander.location_updated_at
      : new Date().toISOString();

  const speedKts =
    islander.speed !== null && islander.speed !== undefined
      ? Number(islander.speed)
      : null;

  const azimuth =
    typeof islander.azimuth === "number" ? islander.azimuth : null;

  const courseDeg = (azimuth ?? 270) as number | 270; // default 270 if missing
  const headingDeg = azimuth ?? null;

  const fallbackName = process.env.SHIP_NAME || "Cruise Ship";
  const name =
    (islander.site_name && islander.site_name.trim()) ||
    (islander.account_name && islander.account_name.trim()) ||
    fallbackName;

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
