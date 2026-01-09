// app/api/sea-route/route.ts
import { NextResponse } from "next/server";
import { createRequire } from "module";

export const runtime = "nodejs"; // needed because searoute-js loads local dataset files

type LatLng = { lat: number; lng: number };

function parseNum(v: string | null): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function inRangeLat(lat: number) {
  return lat >= -90 && lat <= 90;
}

function inRangeLng(lng: number) {
  return lng >= -180 && lng <= 180;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const startLat = parseNum(searchParams.get("startLat"));
    const startLng = parseNum(searchParams.get("startLng"));
    const endLat = parseNum(searchParams.get("endLat"));
    const endLng = parseNum(searchParams.get("endLng"));

    // Optional: "nauticalmiles" (default), "miles", "kilometers", "radians", "degrees"
    const units = (searchParams.get("units") || "nauticalmiles").toLowerCase();

    if (
      startLat == null ||
      startLng == null ||
      endLat == null ||
      endLng == null ||
      !inRangeLat(startLat) ||
      !inRangeLng(startLng) ||
      !inRangeLat(endLat) ||
      !inRangeLng(endLng)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid or missing coordinates. Required: startLat,startLng,endLat,endLng (lat -90..90, lng -180..180).",
        },
        { status: 400 }
      );
    }

    // searoute-js is CommonJS
    const require = createRequire(import.meta.url);
    const searoute = require("searoute-js") as (
      origin: any,
      destination: any,
      units?: string
    ) => any;

    // searoute-js expects GeoJSON Point Features with [lng, lat]
    const origin = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [startLng, startLat],
      },
    };

    const destination = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [endLng, endLat],
      },
    };

    // Returns a GeoJSON LineString Feature (good for drawing) :contentReference[oaicite:3]{index=3}
    let routeFeature: any;

    try {
    routeFeature = searoute(origin, destination, units);
    } catch (e: any) {
    console.error("searoute-js failed", {
        start: { lat: startLat, lng: startLng },
        end: { lat: endLat, lng: endLng },
        units,
        err: e,
    });

    return NextResponse.json(
        {
        error: "Sea route could not be computed for these points (likely too close to shore / not on sea graph).",
        detail: String(e?.message ?? e),
        start: { lat: startLat, lng: startLng },
        end: { lat: endLat, lng: endLng },
        },
        { status: 422 }
    );
    }


    // Convert LineString coords [[lng,lat], ...] -> [{lat,lng}, ...] for Google Maps
    const coords: LatLng[] =
      routeFeature?.geometry?.type === "LineString" &&
      Array.isArray(routeFeature?.geometry?.coordinates)
        ? routeFeature.geometry.coordinates
            .filter((c: any) => Array.isArray(c) && c.length >= 2)
            .map((c: any) => ({ lng: Number(c[0]), lat: Number(c[1]) }))
            .filter((p: any) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
        : [];

    if (coords.length < 2) {
      return NextResponse.json(
        { error: "Sea route could not be computed for these points." },
        { status: 422 }
      );
    }

    // searoute-js typically puts the computed length in properties.length (units = your chosen units)
    const distance = routeFeature?.properties?.length ?? null;

    return NextResponse.json(
      {
        ok: true,
        units,
        distance,
        geojson: routeFeature,
        path: coords, // easiest for PolylineF
      },
      {
        status: 200,
        headers: {
          // cache a bit so you aren't recalculating constantly
          "Cache-Control": "public, max-age=300, s-maxage=300",
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "Server error computing sea route.", detail: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
