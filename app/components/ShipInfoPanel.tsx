// components/ShipInfoPanel.tsx
"use client";

import type { ShipLocation } from "./useShipLocation";

type Props = {
  ship: ShipLocation | null;
  error: string | null;
};

export function ShipInfoPanel({ ship, error }: Props) {
  return (
    <section className="info-pane">
      <div className="info-header">
        <img
          src="/MVAS_Islander Logo.png"
          alt="Logo"
          className="ship-logo"
        />
      </div>

      <div className="ship-card">
        <img
          src="/islander.jpg"
          alt={ship?.name ?? "Ship"}
          className="ship-image"
        />
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
          <div className="stat-label">Course</div>
          <div className="stat-value">
            {ship?.courseDeg != null ? `${ship.courseDeg.toFixed(0)}°` : "--"}
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-label">MMSI</div>
          <div className="stat-value">
            {process.env.NEXT_PUBLIC_MARINESIA_MMSI ?? "–"}
          </div>
        </div>
      </div>

      {error && <p className="error-text">Error: {error}</p>}

      <div className="footer-bar">
        <span>Sunset at present position:</span>
        <span className="footer-value">TBD</span>
      </div>
    </section>
  );
}
