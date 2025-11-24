import { NextResponse } from "next/server";

type ShipLocation = {
  name: string;
  lat: number;
  lng: number;
  lastUpdated: string;
  speedKts: number | null;
  courseDeg: number | null;
  headingDeg: number | null;
};

const MTN_URL =
  "https://customer-api.mtnsat.com/v1/sites?page=1&with_usage=0&limit=10000";

export async function GET() {
  try {
    const token = process.env.MTNSAT_TOKEN;
    if (!token) {
      throw new Error("MTNSAT_TOKEN is not set in environment variables.");
    }

    // You can set this in env: MTNSAT_MMSI=311000969
    const targetMmsi = process.env.MTNSAT_MMSI || "311000969";

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

    if (!json || !Array.isArray(json.rows)) {
      throw new Error("Unexpected MTN API shape: missing rows array.");
    }

    // Prefer a robust identifier (MMSI) instead of the name text
    const paradiseRow = (json.rows as any[]).find(
      (row) => String(row.mmsi) === String(targetMmsi)
    );

    if (!paradiseRow) {
      throw new Error(
        `Ship with MMSI ${targetMmsi} not found in MTN site list.`
      );
    }

    const lat = Number(paradiseRow.latitude);
    const lng = Number(paradiseRow.longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error(
        `Invalid coordinates (lat=${paradiseRow.latitude}, lng=${paradiseRow.longitude})`
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

    const nameRaw =
      typeof paradiseRow.site_name === "string"
        ? paradiseRow.site_name
        : paradiseRow.account_name;
    const name =
      typeof nameRaw === "string" && nameRaw.trim()
        ? nameRaw.trim()
        : "MAS Paradise";

    const shipLocation: ShipLocation = {
      name,
      lat,
      lng,
      lastUpdated: ts,
      speedKts,
      courseDeg: azimuth ?? null,
      headingDeg: azimuth ?? null,
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
