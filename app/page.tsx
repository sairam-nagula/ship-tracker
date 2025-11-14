"use client";

import { useEffect, useState } from "react";
import { GoogleMap, MarkerF, useJsApiLoader } from "@react-google-maps/api";

type ShipLocation = {
  name: string;
  lat: number;
  lng: number;
  lastUpdated: string;
};

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

export default function HomePage() {
  const [ship, setShip] = useState<ShipLocation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
  });

  async function fetchShipLocation() {
    try {
      setError(null);
      const res = await fetch("/api/ship-location");
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      const data = (await res.json()) as ShipLocation;
      setShip(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load ship location");
    }
  }

  useEffect(() => {
    // initial fetch
    fetchShipLocation();

    // poll every 60s
    const id = setInterval(fetchShipLocation, 60_000);
    return () => clearInterval(id);
  }, []);

  const center =
    ship && Number.isFinite(ship.lat) && Number.isFinite(ship.lng)
      ? { lat: ship.lat, lng: ship.lng }
      : { lat: 25.7617, lng: -80.1918 }; // fallback: Miami

  return (
    <main className="page-root">

      {/* LEFT: MAP */}
      <section className="map-pane">
        {isLoaded && ship ? (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={6}
          >
            <MarkerF position={center} />
          </GoogleMap>
        ) : (
          <div className="map-loading">
            {error ? `Error: ${error}` : "Loading map & ship position…"}
          </div>
        )}
      </section>

      {/* RIGHT: INFO PANEL */}
      <section className="info-pane">
        <div className="info-header">
          <h1 className="ship-name">{ship?.name ?? "Cruise Ship"}</h1>
          <p className="subtitle">Live Position Overview</p>
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
              {ship
                ? new Date(ship.lastUpdated).toLocaleString()
                : "Waiting…"}
            </div>
          </div>
          
          {/* placeholders for future API fields */}
          <div className="stat-box">
            <div className="stat-label">Speed</div>
            <div className="stat-value">-- kts</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Course</div>
            <div className="stat-value">--°</div>
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
    </main>
  );
}
