// components/ShipMap.tsx
"use client";

import { useMemo } from "react";
import { GoogleMap, MarkerF, useJsApiLoader } from "@react-google-maps/api";
import type { ShipLocation } from "./useShipLocation";

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

type Props = {
  ship: ShipLocation | null;
  error: string | null;
};

const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID;

export function ShipMap({ ship, error }: Props) {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
    mapIds: MAP_ID ? [MAP_ID] : undefined,
  });

  const center =
    ship && Number.isFinite(ship.lat) && Number.isFinite(ship.lng)
      ? { lat: ship.lat, lng: ship.lng }
      : { lat: 0, lng: 0 };

  const heading = ship?.courseDeg ?? 0;

  // Built-in Google Maps triangle icon
  const shipIcon = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    const g = (window as any).google?.maps;
    if (!g) return undefined;

    return {
      path: g.SymbolPath.FORWARD_CLOSED_ARROW,
      scale: 3,              // size of triangle
      strokeWeight: 1,
      strokeColor: "#000000ff",
      fillColor: "#000000ff",
      fillOpacity: 0.5,
      rotation: heading,     // <-- rotates based on ship heading
    };
  }, [heading, isLoaded]);

  return (
    <section className="map-pane">
      <div className="map-card">
        {isLoaded && ship ? (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={8}
            options={{
              mapId: MAP_ID,
            }}
          >
            <MarkerF position={center} icon={shipIcon} />
          </GoogleMap>
        ) : (
          <div className="map-loading">
            {error ? `Error: ${error}` : "Loading map & ship position…"}
          </div>
        )}
      </div>
    </section>
  );
}
