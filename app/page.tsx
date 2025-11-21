"use client";

import { useEffect, useMemo, useState } from "react";
import { GoogleMap, MarkerF, useJsApiLoader } from "@react-google-maps/api";

type ShipLocation = {
  name: string;
  lat: number;
  lng: number;
  lastUpdated: string;
  speedKts: number | null;
  courseDeg: number | null;
  headingDeg: number | null;
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
      : { lat: 0, lng: 0 }; 
      

  // Build a Google Maps icon using /public/islander.jpg and rotate it
  const shipIcon = useMemo(() => {
    if (!isLoaded || typeof window === "undefined" || !ship) return undefined;

    const g = (window as any).google?.maps;
    if (!g) return undefined;

    const heading = ship.headingDeg ?? ship.courseDeg ?? 0;

    return {
      url: "/shiptopview.png",              
      scaledSize: new g.Size(64, 64),     
      anchor: new g.Point(32, 32),        
      rotation: heading,                 
    } as google.maps.Icon;
  }, [isLoaded, ship]);

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
            <MarkerF position={center} icon={shipIcon} />
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
    </main>
  );
}
