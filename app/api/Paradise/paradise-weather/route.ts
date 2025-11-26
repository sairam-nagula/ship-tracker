import { NextResponse } from "next/server";
import { fetchParadiseFromMTN } from "../paradise-ship-location/route";

type ParadiseWeather = {
  name: string;
  lat: number;
  lng: number;
  lastUpdated: string;
  weatherTempC: number | null;
  weatherDescription: string | null;
  weatherIcon: string | null;
};

export async function GET() {
  try {
    const base = await fetchParadiseFromMTN();
    const weatherKey = process.env.OPENWEATHER_API_KEY;

    let weatherTempC: number | null = null;
    let weatherDescription: string | null = null;
    let weatherIcon: string | null = null;

    if (weatherKey) {
      try {
        const wRes = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${base.lat}&lon=${base.lng}&appid=${weatherKey}&units=imperial`,
          { cache: "no-store" }
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

    const payload: ParadiseWeather = {
      name: base.name,
      lat: base.lat,
      lng: base.lng,
      lastUpdated: base.lastUpdated,
      weatherTempC,
      weatherDescription,
      weatherIcon,
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (error: any) {
    console.error("Error in /api/Paradise/paradise-weather:", error);
    return NextResponse.json(
      {
        error: "Failed to get Paradise weather",
        details: error?.message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}
