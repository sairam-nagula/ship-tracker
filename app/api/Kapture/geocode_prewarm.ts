import { NextResponse } from "next/server";
import { geocodePlace } from "./geocode";

export const runtime = "nodejs";

function isAtSeaLike(port: string): boolean {
  const p = (port || "").toLowerCase();
  return (
    p.includes("at sea") ||
    p.includes("sea day") ||
    p.includes("cruising") ||
    p.includes("sailing")
  );
}

export async function POST(req: Request) {
  const body = await req.json();

  // Accept:
  // { places: ["Cozumel, Mexico", "Progreso, Mexico"] }
  const places: string[] = Array.isArray(body?.places)
    ? body.places
    : [];

  const uniquePlaces = Array.from(
    new Set(
      places
        .map((p) => (p || "").trim())
        .filter(Boolean)
        .filter((p) => !isAtSeaLike(p))
    )
  );

  const results = [];

  for (const place of uniquePlaces) {
    const latlng = await geocodePlace(place);
    results.push({
      place,
      ok: !!latlng,
      lat: latlng?.lat,
      lng: latlng?.lng,
    });
  }

  return NextResponse.json({
    count: results.length,
    results,
  });
}
