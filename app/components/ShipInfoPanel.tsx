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

type ParsedRange = {
  start: Date | null;
  end: Date | null;
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

// Convert all HH:MM substrings into 12-hour format
function formatDateLabelTo12h(label: string): string {
  return label.replace(/\b(\d{1,2}:\d{2})\b/g, (match) => to12Hour(match));
}

// Parse itinerary date ranges ("21 Nov 16:00" or "23 Nov 07:00 - 16:30")
function parseDateRange(label: string, year: number): ParsedRange {
  const match = /^(\d{1,2})\s+([A-Za-z]{3})\s+(.+)$/.exec(label);
  if (!match) return { start: null, end: null };

  const [, dayStr, monthStr, timePart] = match;
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

  return (
    <section className="info-pane">
      <div className="info-header">
        <img src={logoSrc} alt={`${shipLabel} logo`} className="ship-logo" />
      </div>

      {/* Ship image + Cruise News side-by-side */}
      <div className="hero-row">
        <div className="ship-card">
          <img src={heroSrc} alt={shipLabel} className="ship-image" />
        </div>

        {itineraryEndpoint && (
          <section className="itinerary-card">
            <h3 className="itinerary-title">Cruise News</h3>
            <p className="itinerary-empty">
              <img src={cruisenewsEndpoint} alt="Cruise News QR" />
            </p>
          </section>
        )}
      </div>

      <div className="stats-grid">
        {/* Latitude & Longitude */}
        <div className="stat-box">
          <div className="stat-label">Coordinates</div>
          <div className="stat-value">
            {ship ? `${ship.lat.toFixed(4)}°, ${ship.lng.toFixed(4)}°` : "--"}
          </div>
        </div>

        {/* Ship Time (EST) */}
        <div className="stat-box">
          <div className="stat-label">Ship Time</div>
          <div className="stat-value">
            {new Date().toLocaleTimeString("en-US", {
              timeZone: "America/New_York",
              hour: "numeric",
              minute: "numeric",
              hour12: true,
            })}{" "}
            EST
          </div>
        </div>

        {/* Last Update */}
        <div className="stat-box">
          <div className="stat-label">Last Update</div>
          <div className="stat-value">
            {ship ? new Date(ship.lastUpdated).toLocaleString() : "Waiting…"}
          </div>
        </div>

        {/* Speed */}
        <div className="stat-box">
          <div className="stat-label">Speed</div>
          <div className="stat-value">
            {ship?.speedKts != null
              ? `${ktsToMph(ship.speedKts).toFixed(1)} mph`
              : "--"}
          </div>
        </div>

        {/* Direction */}
        <div className="stat-box">
          <div className="stat-label">Direction</div>
          <div className="stat-value">
            {ship?.courseDeg != null ? `${ship.courseDeg.toFixed(0)}°` : "--"}
          </div>
        </div>

        {/* Weather */}
        <div className="stat-box">
          <div className="stat-label">Weather</div>
          {tempF != null || description != null ? (
            <div className="stat-value weather-value">
              {tempF != null && <span>{tempF.toFixed(0)}°F</span>}
              {description && (
                <span className="weather-desc">
                  {description
                    .split(" ")
                    .map(
                      (w: string) =>
                        w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
                    )
                    .join(" ")}
                </span>
              )}
              {weatherIconUrl && (
                <img
                  src={weatherIconUrl}
                  alt={description || "Weather icon"}
                  className="weather-icon"
                />
              )}
              {weatherError && (
                <span className="weather-error">({weatherError})</span>
              )}
            </div>
          ) : (
            <div className="stat-value">--</div>
          )}
        </div>
      </div>

      {/* Quote of the Day */}
      {quote && (
        <div className="quote-card">
          <div className="quote-title">Quote of the Day</div>
          <p className="quote-text">“{quote.text}”</p>
          {quote.author && (
            <p className="quote-author">— {quote.author}</p>
          )}
        </div>
      )}

      {/* (Optional) quote error – keep subtle or omit entirely */}
      {!quote && quoteError && (
        <p className="quote-error">Unable to load today’s quote.</p>
      )}

      {/* Top-level error */}
      {error && <p className="error-text">Error: {error}</p>}
    </section>
  );
}
