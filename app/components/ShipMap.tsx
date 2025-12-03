"use client";

import { GoogleMap, MarkerF, PolylineF } from "@react-google-maps/api";
import { useMemo, useState, useEffect } from "react";
import type { ShipLocation } from "./useShipLocation";
import { useGoogleMapsLoader } from "./useGoogleMapsLoader";

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

export type ShipTrackPoint = {
  lat: number;
  lng: number;
  date: string;
};

type Props = {
  ship: ShipLocation | null;
  error: string | null;
  track?: ShipTrackPoint[];
};

const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID;

export function ShipMap({ ship, error, track = [] }: Props) {
  const { isLoaded } = useGoogleMapsLoader();

  const [zoom, setZoom] = useState(7);
  const [targetZoom, setTargetZoom] = useState(7);

  const center =
    ship && Number.isFinite(ship.lat) && Number.isFinite(ship.lng)
      ? { lat: ship.lat, lng: ship.lng }
      : { lat: 0, lng: 0 };

  const heading = ship?.courseDeg ?? 0;

  // Basic ship triangle icon
  const shipIcon = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    const g = (window as any).google?.maps;
    if (!g) return undefined;

    return {
      path: g.SymbolPath.FORWARD_CLOSED_ARROW,
      scale: 4,
      strokeWeight: 1,
      strokeColor: "#000000ff",
      fillColor: "#000000ff",
      fillOpacity: 0.5,
      rotation: heading,
    };
  }, [heading, isLoaded]);

  // Build a simple path directly from track
  const path = useMemo(
    () =>
      (track || [])
        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
        .map((p) => ({ lat: p.lat, lng: p.lng })),
    [track]
  );

  // Zoom cycle: zoom in 5 sec, then zoom out 20 sec
  useEffect(() => {
    if (!isLoaded || !ship) return;

    let zoomInTimeout: NodeJS.Timeout;
    let zoomOutTimeout: NodeJS.Timeout;

    const startZoomCycle = () => {
      setTargetZoom(10);

      zoomInTimeout = setTimeout(() => {
        setTargetZoom(7);

        zoomOutTimeout = setTimeout(() => {
          startZoomCycle();
        }, 20_000);
      }, 5_000);
    };

    startZoomCycle();

    return () => {
      clearTimeout(zoomInTimeout);
      clearTimeout(zoomOutTimeout);
    };
  }, [isLoaded, ship]);

  // Smooth zoom interpolation toward targetZoom
  useEffect(() => {
    if (!isLoaded) return;

    const step = 0.15;
    const frameMs = 150;

    const id = setInterval(() => {
      setZoom((current) => {
        const diff = targetZoom - current;
        if (Math.abs(diff) <= step) {
          clearInterval(id);
          return targetZoom;
        }
        const direction = diff > 0 ? 1 : -1;
        return current + direction * step;
      });
    }, frameMs);

    return () => clearInterval(id);
  }, [targetZoom, isLoaded]);

  return (
    <section className="map-pane">
      <div className="map-card">
        {isLoaded && ship ? (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={zoom}
            options={{
              mapId: MAP_ID,
              disableDefaultUI: true,
              zoomControl: false,
              mapTypeControl: false,
              streetViewControl: false,
              fullscreenControl: false,
              keyboardShortcuts: false,
              clickableIcons: false,
            }}
          >
            {path.length > 1 && (
              <PolylineF
                path={path}
                options={{
                  geodesic: true,
                  strokeOpacity: 0.7,
                  strokeWeight: 2,
                  strokeColor: "#000000ff", // your teal
                }}
              />
            )}

            {/* Ship Marker */}
            <MarkerF position={center} icon={shipIcon} />
          </GoogleMap>
        ) : (
          <div className="map-loading">
            {error ? `Error: ${error}` : "Loading map…"}
          </div>
        )}
      </div>
    </section>
  );
}
