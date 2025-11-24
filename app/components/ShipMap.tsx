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

export function ShipMap({ ship, error }: Props) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
  });

  const center =
    ship && Number.isFinite(ship.lat) && Number.isFinite(ship.lng)
      ? { lat: ship.lat, lng: ship.lng }
      : { lat: 0, lng: 0 };

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
    <section className="map-pane">
      <div className="map-card">
        {isLoaded && ship ? (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={7}
            options={{
              styles: [
                {
                  featureType: "administrative",
                  elementType: "labels",
                  stylers: [{ visibility: "off" }],
                },
                {
                  featureType: "poi",
                  elementType: "labels",
                  stylers: [{ visibility: "off" }],
                },
                {
                  featureType: "road",
                  elementType: "labels",
                  stylers: [{ visibility: "off" }],
                },
                {
                  featureType: "transit",
                  elementType: "labels",
                  stylers: [{ visibility: "off" }],
                },
                {
                  featureType: "water",
                  elementType: "labels",
                  stylers: [{ visibility: "off" }],
                },
                {
                  featureType: "landscape",
                  elementType: "labels",
                  stylers: [{ visibility: "off" }],
                },
              ],
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
