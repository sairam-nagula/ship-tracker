"use client";

import type { ShipLocation } from "./useShipLocation";

type Props = {
  ship: ShipLocation | null;
  error: string | null;
  logoSrc: string;   // Islander vs Paradise logo
  heroSrc: string;   // Big ship photo
  shipLabel: string; // For alt text
};

export function ShipInfoPanel({
  ship,
  error,
  logoSrc,
  heroSrc,
  shipLabel,
}: Props) {
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
            {ship?.speedKts != null ? `${ship.speedKts.toFixed(1)} kts` : "--"}
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-label">Direction</div>
          <div className="stat-value">
            {ship?.courseDeg != null ? `${ship.courseDeg.toFixed(0)}°` : "--"}
          </div>
        </div>
      </div>

      {error && <p className="error-text">Error: {error}</p>}

            <div className="footer-bar">
        <span>Weather at present position:</span>

        {ship?.weatherTempC != null ||
        ship?.weatherDescription ||
        ship?.weatherIcon ? (
          <span
            className="footer-value"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              textTransform: "capitalize",
            }}
          >
            {/* Temperature */}
            {ship?.weatherTempC != null && (
              <span>{ship.weatherTempC.toFixed(1)}°C</span>
            )}

            {/* Short description like "clear sky" */}
            {ship?.weatherDescription && (
              <span>{ship.weatherDescription}</span>
            )}

            {/* Weather icon */}
            {ship?.weatherIcon && (
              <img
                src={`https://openweathermap.org/img/wn/${ship.weatherIcon}@2x.png`}
                alt={ship.weatherDescription ?? "Weather icon"}
                style={{ width: 32, height: 32 }}
              />
            )}
          </span>
        ) : (
          <span className="footer-value">Loading…</span>
        )}
      </div>

    </section>
  );
}
