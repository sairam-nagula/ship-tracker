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
  itineraryEndpoint?: string;
};

type ParsedRange = {
  start: Date | null;
  end: Date | null;
};

// Convert HH:MM to 12-hour format
function to12Hour(time: string): string {
  const [hStr, m] = time.split(":");
  let h = Number(hStr);
  const ampm = h >= 12 ? "PM" : "AM";

  if (h === 0) h = 12;
  else if (h > 12) h -= 12;

  return `${h}:${m} ${ampm}`;
}

// Convert knots to miles per hour
function ktsToMph(kts: number): number {
  return kts * 1.15078;
}


// Convert all HH:MM bits in the label to 12-hour format
function formatDateLabelTo12h(label: string): string {
  return label.replace(/\b(\d{1,2}:\d{2})\b/g, (match) => to12Hour(match));
}

// Handles "21 Nov 16:00" and "23 Nov 07:00 - 16:30"
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
}: Props) {
  const [itinerary, setItinerary] = useState<ItineraryRow[] | null>(null);
  const [itineraryError, setItineraryError] = useState<string | null>(null);
  const [itineraryLoading, setItineraryLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const weatherIconUrl = ship?.weatherIcon
    ? `https://openweathermap.org/img/wn/${ship.weatherIcon}@2x.png`
    : null;

  useEffect(() => {
    if (!itineraryEndpoint) return;

    async function loadItinerary() {
      try {
        setItineraryLoading(true);
        setItineraryError(null);

        const res = await fetch(itineraryEndpoint!, { cache: "no-store" });
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

  // Figure out which itinerary row we are currently in
  useEffect(() => {
    if (!itinerary || itinerary.length === 0) {
      setActiveIndex(null);
      return;
    }

    const year = new Date().getFullYear();
    const parsed = itinerary.map((row) => parseDateRange(row.date, year));
    const now = new Date();

    let current: number | null = null;

    for (let i = 0; i < parsed.length; i++) {
      const cur = parsed[i];
      if (!cur.start) continue;

      const next = parsed[i + 1];
      const legEnd = cur.end ?? next?.start ?? null;

      if (legEnd) {
        if (now >= cur.start && now < legEnd) {
          current = i;
          break;
        }
      } else if (now >= cur.start) {
        current = i;
        break;
      }
    }

    setActiveIndex(current);
  }, [itinerary]);

  return (
    <section className="info-pane">
      <div className="info-header">
        <img src={logoSrc} alt={`${shipLabel} logo`} className="ship-logo" />
      </div>

      <div className="ship-card">
        <img src={heroSrc} alt={shipLabel} className="ship-image" />
      </div>

      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-label">Latitude</div>
          <div className="stat-value">
            {ship ? `${ship.lat.toFixed(4)}°` : "--"}
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-label">Longitude</div>
          <div className="stat-value">
            {ship ? `${ship.lng.toFixed(4)}°` : "--"}
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-label">Last Update</div>
          <div className="stat-value">
            {ship ? new Date(ship.lastUpdated).toLocaleString() : "Waiting…"}
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-label">Speed</div>
          <div className="stat-value">
            {ship?.speedKts != null ? `${ktsToMph(ship.speedKts).toFixed(1)} mph` : "--"}
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-label">Direction</div>
          <div className="stat-value">
            {ship?.courseDeg != null ? `${ship.courseDeg.toFixed(0)}°` : "--"}
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-label">Weather</div>
          {ship &&
          (ship.weatherTempC != null || ship.weatherDescription != null) ? (
            <div className="stat-value weather-value">
              {ship.weatherTempC != null && (
                <span>{ship.weatherTempC.toFixed(0)}°F</span>
              )}
              {ship.weatherDescription && (
                <span className="weather-desc">
                  {ship.weatherDescription
                    .split(" ")
                    .map(
                      (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
                    )
                    .join(" ")}
                </span>
              )}
              {weatherIconUrl && (
                <img
                  src={weatherIconUrl}
                  alt={ship.weatherDescription || "Weather icon"}
                  className="weather-icon"
                />
              )}
            </div>
          ) : (
            <div className="stat-value">--</div>
          )}
        </div>
      </div>

      {error && <p className="error-text">Error: {error}</p>}

      {itineraryEndpoint && (
        <section className="itinerary-card">
          <h3 className="itinerary-title">Current Itinerary</h3>

          {itineraryLoading && (
            <p className="itinerary-loading">Loading current itinerary…</p>
          )}

          {itineraryError && (
            <p className="error-text">Itinerary error: {itineraryError}</p>
          )}

          {itinerary && itinerary.length > 0 && (
            <table className="itinerary-table">
              <thead>
                <tr>
                  <th className="itinerary-th-date">Date / Time</th>
                  <th className="itinerary-th-port">Port</th>
                </tr>
              </thead>
              <tbody>
                {itinerary.map((row, idx) => {
                  const isActive = idx === activeIndex;
                  return (
                    <tr
                      key={idx}
                      className={isActive ? "itinerary-row-active" : ""}
                    >
                      <td className="itinerary-td-date">
                        {formatDateLabelTo12h(row.date)}
                      </td>
                      <td className="itinerary-td-port">{row.port}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {itinerary &&
            itinerary.length === 0 &&
            !itineraryLoading &&
            !itineraryError && (
              <p className="itinerary-empty">No itinerary data available.</p>
            )}
        </section>
      )}
    </section>
  );
}
