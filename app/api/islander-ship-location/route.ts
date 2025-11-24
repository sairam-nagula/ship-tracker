import { NextResponse } from "next/server";

type ShipLocation = {
  name: string;
  lat: number;
  lng: number;
  lastUpdated: string;

  speedKts: number | null;
  courseDeg: number | null;

  weatherTempC: number | null;
  weatherDescription: string | null;
  weatherIcon: string | null; // e.g. "01d"
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
};

const MTN_URL =
  "https://customer-api.mtnsat.com/v1/sites?page=1&with_usage=0&limit=10000";

async function fetchShipFromMtnsat(): Promise<ShipLocation> {
  const token = process.env.MTNSAT_TOKEN;
  const weatherKey = process.env.OPENWEATHER_API_KEY;

  if (!token) {
    throw new Error("MTNSAT_TOKEN is not set in environment variables.");
  }

  const res = await fetch(MTN_URL, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `MTN /sites API error: ${res.status} ${res.statusText} ${text}`,
    );
  }

  const data = (await res.json()) as MtnSitesResponse;

  if (!data || !Array.isArray(data.rows) || data.rows.length === 0) {
    throw new Error("MTN /sites API returned no rows.");
  }

  // MAS Islander (site_id 916 or name "MAS Islander")
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
      `Invalid coordinates from MTN (lat=${islander.latitude}, lng=${islander.longitude}).`,
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

  const name =
    islander.site_name?.trim() ||
    islander.account_name?.trim() ||
    "MAS Islander";

  // -----------------------------
  // OpenWeather: best-effort weather at lat/lng
  // -----------------------------
  let weatherTempC: number | null = null;
  let weatherDescription: string | null = null;
  let weatherIcon: string | null = null;

  if (weatherKey) {
    try {
      const wRes = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${weatherKey}&units=imperial`,
        { cache: "no-store" },
      );

      if (wRes.ok) {
        const wJson: any = await wRes.json();
        const temp = wJson?.main?.temp;
        const desc = wJson?.weather?.[0]?.description;
        const icon = wJson?.weather?.[0]?.icon;

        weatherTempC = typeof temp === "number" ? temp : null;
        weatherDescription = typeof desc === "string" ? desc : null;
        weatherIcon = typeof icon === "string" ? icon : null;
      } else {
        console.warn("OpenWeather error:", wRes.status, wRes.statusText);
      }
    } catch (wErr) {
      console.warn("OpenWeather fetch failed:", wErr);
    }
  }

  return {
    name,
    lat,
    lng,
    lastUpdated: ts,
    speedKts,
    courseDeg: azimuth,
    weatherTempC,
    weatherDescription,
    weatherIcon,
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
      { status: 500 },
    );
  }
}
