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
  weatherIcon: string | null;
};

const MTN_URL =
  "https://customer-api.mtnsat.com/v1/sites?page=1&with_usage=0&limit=10000";

export async function GET() {
  try {
    const token = process.env.MTNSAT_TOKEN;
    const weatherKey = process.env.OPENWEATHER_API_KEY; 

    if (!token) {
      throw new Error("MTNSAT_TOKEN is not set in environment variables.");
    }

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

    const paradiseRow = (json.rows as any[]).find(
      (row) => row.site_name === "MAS Paradise"
    );

    if (!paradiseRow) {
      throw new Error("MAS Paradise not found in MTN site list.");
    }

    const lat = Number(paradiseRow.latitude);
    const lng = Number(paradiseRow.longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error(
        `Invalid coordinates for Paradise (lat=${paradiseRow.latitude}, lng=${paradiseRow.longitude})`
      );
    }

    const speedKts =
      paradiseRow.speed !== undefined && paradiseRow.speed !== null
        ? Number(paradiseRow.speed)
        : null;

    const azimuth =
      paradiseRow.azimuth !== undefined && paradiseRow.azimuth !== null
        ? Number(paradiseRow.azimuth)
        : null;

    const ts: string =
      typeof paradiseRow.location_updated_at === "string"
        ? paradiseRow.location_updated_at
        : new Date().toISOString();

    const name =
      typeof paradiseRow.site_name === "string" && paradiseRow.site_name.trim()
        ? paradiseRow.site_name
        : "MAS Paradise";

    // =========================
    // OpenWeather fetch (optional / best-effort)
    // =========================
    let weatherTempC: number | null = null;
    let weatherDescription: string | null = null;
    let weatherIcon: string | null = null;

    if (weatherKey) {
      try {
        const wRes = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${weatherKey}&units=imperial`,
          { cache: "no-store" }
        );

        if (wRes.ok) {
          const wJson: any = await wRes.json();
          const temp = wJson?.main?.temp;
          const desc = wJson?.weather?.[0]?.description;
          const icon = wJson?.weather?.[0]?.icon;

          weatherTempC = typeof temp === "number" ? temp : null;
          weatherDescription =
            typeof desc === "string" ? desc : null;
          weatherIcon = typeof icon === "string" ? icon : null;
        } else {
          console.warn("OpenWeather error:", wRes.status, wRes.statusText);
        }
      } catch (wErr) {
        console.warn("OpenWeather fetch failed:", wErr);
      }
    }

    const shipLocation: ShipLocation = {
      name,
      lat,
      lng,
      lastUpdated: ts,
      speedKts,
      courseDeg: azimuth ?? null,
      weatherTempC,
      weatherDescription,
      weatherIcon,
    };

    return NextResponse.json(shipLocation, { status: 200 });
  } catch (error: any) {
    console.error("Error in /api/paradise-ship-location:", error);
    return NextResponse.json(
      {
        error: "Failed to get Paradise ship location",
        details: error?.message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}
