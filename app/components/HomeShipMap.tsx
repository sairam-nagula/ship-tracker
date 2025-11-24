"use client";

import { GoogleMap, MarkerF } from "@react-google-maps/api";
import { useMemo } from "react";
import type { ShipLocation } from "./useShipLocation";

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

type Props = {
  ship: ShipLocation | null;
  error: string | null;
  isLoaded: boolean;
};

export function HomeShipMap({ ship, error, isLoaded }: Props) {
  const center = useMemo(
    () =>
      ship &&
      Number.isFinite(ship.lat) &&
      Number.isFinite(ship.lng)
        ? { lat: ship.lat, lng: ship.lng }
        : { lat: 26.7, lng: -80.05 },
    [ship]
  );

  const heading = ship?.headingDeg ?? ship?.courseDeg ?? 0;

  const icon = useMemo(() => {
    if (!isLoaded || typeof window === "undefined") return undefined;

    const g = window.google;
    if (!g) return undefined;

    return {
      path: g.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      scale: 3,              // size of triangle
      strokeWeight: 1,
      strokeColor: "#000000ff",
      fillColor: "#000000ff",
      fillOpacity: 0.5,
      rotation: heading,
    };
  }, [heading, isLoaded]);

  if (!isLoaded) {
    return <div className="map-loading">Loading map…</div>;
  }

  const hasValidPosition =
    ship &&
    Number.isFinite(ship.lat) &&
    Number.isFinite(ship.lng);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={6}
        options={{
            mapId: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID_HOMEPAGE,

            // Remove default UI
            disableDefaultUI: true,
            zoomControl: false,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            keyboardShortcuts: false,
            clickableIcons: false,
  }}
      >
        {hasValidPosition && (
          <MarkerF
            position={{ lat: ship.lat!, lng: ship.lng! }}
            icon={icon}
          />
        )}
      </GoogleMap>

      {error && (
        <div
          style={{
            position: "absolute",
            left: 10,
            bottom: 10,
            padding: "4px 8px",
            borderRadius: 6,
            background: "rgba(15,23,42,0.85)",
            color: "#fecaca",
            fontSize: "0.8rem",
          }}
        >
          Live position error — using fallback map.
        </div>
      )}
    </div>
  );
}
