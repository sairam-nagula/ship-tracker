import { NextResponse } from "next/server";
import { fetchParadiseFromMTN } from "../paradise-ship-location/route";

type ParadiseWeather = {
  name: string;
  lat: number;
  lng: number;
  lastUpdated: string;
  weatherTempF: number | null;
  weatherDescription: string | null;
  weatherIconLocal: string | null;
  weatherId: number | null;
};

function mapOpenWeatherIdToLocalIcon(id: number | null): string | null {
  if (id == null) return null;

  if (id >= 200 && id <= 232) return "/thunderstorm.png";
  if (id >= 300 && id <= 321) return "/partly-cloudy-rain.png";

  if (id >= 500 && id <= 531) {
    if (id >= 520) return "/cloudy-rain.png";
    return "/rain.png";
  }

  if (id >= 600 && id <= 622) return "/windy.png";
  if (id >= 701 && id <= 781) return "/windy.png";

  if (id === 800) return "/sunny.png";

  if (id === 801 || id === 802) return "/partly-cloudy.png";
  if (id === 803 || id === 804) return "/cloudy.png";

  return "/cloudy.png";
}

export async function GET() {
  try {
    const base = await fetchParadiseFromMTN();
    const weatherKey = process.env.OPENWEATHER_API_KEY;

    let weatherTempF: number | null = null;
    let weatherDescription: string | null = null;
    let weatherId: number | null = null;
    let weatherIconLocal: string | null = null;

    if (weatherKey) {
      const wRes = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${base.lat}&lon=${base.lng}&appid=${weatherKey}&units=imperial`,
        { cache: "no-store" }
      );

      if (wRes.ok) {
        const wJson: any = await wRes.json();

        const temp = wJson?.main?.temp;
        const desc = wJson?.weather?.[0]?.description;
        const id = wJson?.weather?.[0]?.id;

        weatherTempF = typeof temp === "number" ? temp : null;
        weatherDescription = typeof desc === "string" ? desc : null;
        weatherId = typeof id === "number" ? id : null;
        weatherIconLocal = mapOpenWeatherIdToLocalIcon(weatherId);
      } else {
        console.warn("OpenWeather error:", wRes.status, wRes.statusText);
      }
    }

    const payload: ParadiseWeather = {
      name: base.name,
      lat: base.lat,
      lng: base.lng,
      lastUpdated: base.lastUpdated,
      weatherTempF,
      weatherDescription,
      weatherIconLocal,
      weatherId,
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
