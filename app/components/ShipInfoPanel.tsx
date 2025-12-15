"use client";

import { useEffect, useState } from "react";
import type { ShipLocation } from "./useShipLocation";

type ItineraryRow = {
  date: string;
  port: string;
};

type Props = {
  ship: ShipLocation | null;
  error: string | null;
  logoSrc: string;
  heroSrc: string;
  shipLabel: string;
  itineraryEndpoint: string;
  cruisenewsEndpoint: string;
};

type WeatherState = {
  weatherTempC: number | null;
  weatherDescription: string | null;
  weatherIcon: string | null;
};

type Quote = {
  text: string;
  author?: string;
};

type ParsedRange = {
  start: Date | null;
  end: Date | null;
};

function parseTime12hToHM(t: string): { h: number; m: number } | null {
  const m = /^\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\s*$/i.exec(t);
  if (!m) return null;

  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  const ampm = m[3].toUpperCase();

  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  if (h < 1 || h > 12 || min < 0 || min > 59) return null;

  if (ampm === "AM") {
    if (h === 12) h = 0;
  } else {
    if (h !== 12) h += 12;
  }

  return { h, m: min };
}

function buildDate(y: number, mon1to12: number, d: number, time?: string): Date | null {
  const dt = new Date(y, mon1to12 - 1, d, 0, 0, 0, 0);

  if (time && time.trim()) {
    const hm = parseTime12hToHM(time);
    if (!hm) return null;
    dt.setHours(hm.h, hm.m, 0, 0);
  }

  return Number.isNaN(dt.getTime()) ? null : dt;
}

function parseDateRange(label: string, year: number): ParsedRange {
  const raw = (label || "").replace(/\s+/g, " ").trim();
  if (!raw) return { start: null, end: null };

  // Kapture: MM/DD/YYYY [time] or MM/DD/YYYY [time - time]
  const kap = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(.*))?$/.exec(raw);
  if (kap) {
    const mon = Number(kap[1]);
    const day = Number(kap[2]);
    const y = Number(kap[3]);
    const timePart = (kap[4] || "").trim();

    if (!Number.isFinite(mon) || !Number.isFinite(day) || !Number.isFinite(y)) {
      return { start: null, end: null };
    }

    if (!timePart) {
      const start = buildDate(y, mon, day);
      return { start, end: null };
    }

    if (timePart.includes("-")) {
      const [startStr, endStr] = timePart.split("-").map((s) => s.trim());
      const start = buildDate(y, mon, day, startStr);
      const end = buildDate(y, mon, day, endStr);
      return { start, end };
    }

    const start = buildDate(y, mon, day, timePart);
    return { start, end: null };
  }

  // CruiseMapper: "21 Nov 16:00" or "23 Nov 07:00 - 16:30"
  const cm = /^(\d{1,2})\s+([A-Za-z]{3})\s+(.+)$/.exec(raw);
  if (!cm) return { start: null, end: null };

  const [, dayStr, monthStr, timePart] = cm;
  const base = `${dayStr} ${monthStr} ${year}`;

  if (timePart.includes("-")) {
    const [startStr, endStr] = timePart.split("-").map((s) => s.trim());
    const start = new Date(`${base} ${startStr}`);
    const end = new Date(`${base} ${endStr}`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return { start: null, end: null };
    }

    return { start, end };
  }

  const start = new Date(`${base} ${timePart.trim()}`);
  if (Number.isNaN(start.getTime())) return { start: null, end: null };

  return { start, end: null };
}



// Map ship label -> correct weather API endpoint
function getWeatherEndpoint(shipLabel: string): string | null {
  const normalized = shipLabel
    .toLowerCase()
    .replace(/^mvas\s*/, "") // remove "mvas" at the start
    .trim();

  console.log("Normalized ship label for weather:", normalized);

  if (normalized === "paradise") {
    return "/api/Paradise/paradise-weather";
  }

  if (normalized === "islander") {
    return "/api/Islander/islander-weather";
  }

  return null;
}

// Convert HH:MM to 12-hour format
function to12Hour(time: string): string {
  const [hStr, m] = time.split(":");
  let h = Number(hStr);
  const ampm = h >= 12 ? "PM" : "AM";

  if (h === 0) h = 12;
  else if (h > 12) h -= 12;

  return `${h}:${m} ${ampm}`;
}

// Convert knots to mph
function ktsToMph(kts: number): number {
  return kts * 1.15078;
}


export function ShipInfoPanel({
  ship,
  error,
  logoSrc,
  heroSrc,
  shipLabel,
  itineraryEndpoint,
  cruisenewsEndpoint,
}: Props) {
  const [itinerary, setItinerary] = useState<ItineraryRow[] | null>(null);
  const [itineraryError, setItineraryError] = useState<string | null>(null);
  const [itineraryLoading, setItineraryLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const [weather, setWeather] = useState<WeatherState | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Weather endpoint (determined automatically from label)
  const weatherEndpoint = getWeatherEndpoint(shipLabel);
  console.log("Weather API endpoint:", weatherEndpoint);

  // Pick weather icon code from fetched weather first, fallback to ship
  const weatherIconCode = weather?.weatherIcon ?? ship?.weatherIcon ?? null;

  const weatherIconUrl = weatherIconCode
    ? `https://openweathermap.org/img/wn/${weatherIconCode}@2x.png`
    : null;

  // Load itinerary data
  useEffect(() => {
    if (!itineraryEndpoint) return;

    async function loadItinerary() {
      try {
        setItineraryLoading(true);
        setItineraryError(null);

        const res = await fetch(itineraryEndpoint, { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`Itinerary API error: ${res.status}`);
        }

        const json = (await res.json()) as { rows?: ItineraryRow[] };
        setItinerary(json.rows ?? []);
      } catch (e: any) {
        console.error(e);
        setItineraryError(e?.message || "Failed to load itinerary");
      } finally {
        setItineraryLoading(false);
      }
    }

    loadItinerary();
  }, [itineraryEndpoint]);

  // Load weather data from the correct endpoint
  useEffect(() => {
    if (!weatherEndpoint) {
      setWeather(null);
      setWeatherError(null);
      return;
    }

    async function loadWeather() {
      try {
        setWeatherError(null);

        const res = await fetch(weatherEndpoint!, { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`Weather API error: ${res.status}`);
        }

        const json = await res.json();
        setWeather({
          weatherTempC:
            typeof json.weatherTempC === "number" ? json.weatherTempC : null,
          weatherDescription:
            typeof json.weatherDescription === "string"
              ? json.weatherDescription
              : null,
          weatherIcon:
            typeof json.weatherIcon === "string" ? json.weatherIcon : null,
        });
      } catch (e: any) {
        console.error(e);
        setWeather(null);
        setWeatherError(e?.message || "Failed to load weather");
      }
    }

    loadWeather();
  }, [weatherEndpoint]);

  // Load Quote of the Day
  useEffect(() => {
    async function loadQuote() {
      try {
        setQuoteError(null);
        const res = await fetch("/api/quotes", { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`Quote API error: ${res.status}`);
        }

        const json = await res.json();
        setQuote(json.quote ?? null);
      } catch (e: any) {
        console.error("Quote fetch error:", e);
        setQuote(null);
        setQuoteError(e?.message || "Failed to load quote");
      }
    }

    loadQuote();
  }, []);

  // Determine which itinerary row is active right now
  useEffect(() => {
    if (!itinerary || itinerary.length === 0) {
      setActiveIndex(null);
      return;
    }

    const year = new Date().getFullYear();
    const parsed = itinerary.map((row) => parseDateRange(row.date, year));
    const now = new Date();

    let current: number | null = null;

    // 1) Try to find a leg where "now" is inside [start, end)
    for (let i = 0; i < parsed.length; i++) {
      const cur = parsed[i];
      if (!cur.start) continue;

      const next = parsed[i + 1];
      const legEnd = cur.end ?? next?.start ?? null;

      if (legEnd && now >= cur.start && now < legEnd) {
        current = i;
        break;
      }
    }

    // 2) If none, pick the first leg that is still in the future
    if (current === null) {
      for (let i = 0; i < parsed.length; i++) {
        const cur = parsed[i];
        if (!cur.start) continue;

        if (now < cur.start) {
          current = i;
          break;
        }
      }
    }

    // 3) If still none, everything is in the past -> highlight last row
    if (current === null) {
      current = parsed.length - 1;
    }

    setActiveIndex(current);
  }, [itinerary]);

  // Prefer fetched weather; fall back to ship
  const tempF = weather?.weatherTempC ?? ship?.weatherTempC ?? null;
  const description =
    weather?.weatherDescription ?? ship?.weatherDescription ?? null;

  const startIdx =
    itinerary && itinerary.length > 3 && activeIndex != null
      ? Math.max(0, Math.min(activeIndex, itinerary.length - 3))
      : 0;

  // ShipInfoPanel.tsx (JSX return only)

return (
<section className="ship-info-panel-root">
  <div
    className="ship-info-panel-topbg"
    style={{ backgroundImage: `url(${heroSrc})` }}
  >
    <div className="ship-info-panel-hero">
      <div className="ship-info-panel-hero-content">
        <div className="ship-info-panel-shipname">
          {shipLabel.replace(/^MVAS\s*/i, "")}
        </div>

        <div className="ship-info-panel-itinerary">
          {itineraryLoading && (
            <div className="ship-info-panel-itin-loading">
              Loading itinerary…
            </div>
          )}

          {!itineraryLoading && (itinerary?.length ?? 0) > 0 && (
            <>
              {(itinerary ?? []).slice(startIdx, startIdx + 3).map((row, i) => {
                const actualIndex = startIdx + i;
                const hasActive = activeIndex != null;
                const isActive = activeIndex === actualIndex;
                const isFaded = hasActive && !isActive;
                const dayNum = actualIndex + 1;

                return (
                  <div
                    key={`${row.date}-${row.port}-${actualIndex}`}
                    className={`ship-info-panel-itin-row ${isActive ? "is-active" : ""} ${
                      isFaded ? "is-faded" : ""
                    }`}
                    style={{
                      opacity: isFaded ? 0.35 : 1,
                      filter: isFaded ? "saturate(0.85)" : "none",
                      transition:
                        "opacity 180ms ease, transform 180ms ease, filter 180ms ease",
                    }}
                  >
                    {isActive ? (
                      <img
                        src="/location-marker-white-smaller.png"
                        alt=""
                        className="ship-info-panel-itin-marker"
                        style={{ width: 28, height: 28, objectFit: "contain" }}
                      />
                    ) : (
                      <div
                        className="ship-info-panel-itin-dot is-yellow"
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 999,
                          background: "var(--ship-info-panel-yellow)",
                          flex: "0 0 auto",
                          opacity: 1,
                        }}
                      />
                    )}

                    <div className="ship-info-panel-itin-text">
                      <span className="ship-info-panel-itin-day">Day {dayNum}</span>
                      <span className="ship-info-panel-itin-sep">|</span>
                      <span className="ship-info-panel-itin-port">{row.port}</span>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>

    <div className="ship-info-panel-weather-bar">
      <div className="ship-info-panel-weather-left">
        <div className="ship-info-panel-weather-icon-wrap">
          {weatherIconUrl && (
            <img
              src={weatherIconUrl}
              alt={description || "Weather"}
              className="ship-info-panel-weather-icon"
            />
          )}
        </div>

        <div className="ship-info-panel-weather-text">
          <div className="ship-info-panel-weather-temp">
            {tempF != null ? `${tempF.toFixed(0)}°F` : "--°F"}
          </div>
          <div className="ship-info-panel-weather-desc">
            {description
              ? description
                  .split(" ")
                  .map(
                    (w) =>
                      w.charAt(0).toUpperCase() +
                      w.slice(1).toLowerCase()
                  )
                  .join(" ")
              : "—"}
          </div>
        </div>
      </div>
    </div>

    <div className="ship-info-panel-stats-2x2">
      <div className="ship-info-panel-stat">
        <div className="ship-info-panel-stat-label">Longitude</div>
        <div className="ship-info-panel-stat-value">
          {ship ? `${ship.lng.toFixed(4)}°` : "00.0000°"}
        </div>
      </div>

      <div className="ship-info-panel-stat">
        <div className="ship-info-panel-stat-label">Latitude</div>
        <div className="ship-info-panel-stat-value">
          {ship ? `${ship.lat.toFixed(4)}°` : "00.0000°"}
        </div>
      </div>

      <div className="ship-info-panel-stat">
        <div className="ship-info-panel-stat-label">Speed</div>
        <div className="ship-info-panel-stat-value">
          {ship?.speedKts != null
            ? `${ktsToMph(ship.speedKts).toFixed(1)} mph`
            : "00.0 mph"}
        </div>
      </div>

      <div className="ship-info-panel-stat">
        <div className="ship-info-panel-stat-label">Direction</div>
        <div className="ship-info-panel-stat-value">
          {ship?.courseDeg != null ? `${ship.courseDeg.toFixed(0)}°` : "00°"}
        </div>
      </div>
    </div>

    <div className="ship-info-panel-yellow-banner">
      <div className="ship-info-panel-yellow-text">
        Current Ship Time:{" "}
        {new Date().toLocaleTimeString("en-US", {
          timeZone: "America/New_York",
          hour: "numeric",
          minute: "numeric",
          hour12: true,
        })}
      </div>
    </div>
  </div>

  <div className="ship-info-panel-qr-strip">
    <div className="ship-info-panel-qr-box">
      <div className="ship-info-panel-qr-img-wrap">
        <img
          src={cruisenewsEndpoint}
          alt="Cruise News QR"
          className="ship-info-panel-qr-img"
        />
      </div>
    </div>

    <div className="ship-info-panel-qr-copy">
      <div className="ship-info-panel-qr-title">SCAN HERE FOR</div>
      <div className="ship-info-panel-qr-title big">CRUISE NEWS</div>
    </div>
  </div>
</section>
  );
}
