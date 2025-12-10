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

  // Raw ship center from live data
  const shipCenter =
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
      fillOpacity: 1,
      rotation: heading,
      anchor: new g.Point(-0.8, 2.5),
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

  // Compute marker position:
  // - If we have a path and the last point is not (basically) equal to shipCenter,
  //   use the last path point to avoid a gap.
  // - Otherwise, use shipCenter.
  const markerPosition = useMemo(() => {
    if (!path.length) return shipCenter;

    const last = path[path.length - 1];
    const epsilon = 0.0001; // small threshold for "same place"

    const isSameAsShipCenter =
      Math.abs(last.lat - shipCenter.lat) < epsilon &&
      Math.abs(last.lng - shipCenter.lng) < epsilon;

    return isSameAsShipCenter ? shipCenter : last;
  }, [path, shipCenter.lat, shipCenter.lng]);

  // Use markerPosition as the map center so the camera follows what the guest sees
  const center = markerPosition;

  // Build faded segments: older = lighter, newer = darker
  const fadedSegments = useMemo(() => {
    if (path.length < 2) return [];

    const maxSegments = 10;
    const segmentsCount = Math.min(maxSegments, path.length - 1);
    const segments: { path: { lat: number; lng: number }[]; opacity: number }[] =
      [];

    const oldestOpacity = 0.15;
    const newestOpacity = 0.9;

    for (let s = 0; s < segmentsCount; s++) {
      const startIndex = Math.floor((s * (path.length - 1)) / segmentsCount);
      const endIndex = Math.floor(((s + 1) * (path.length - 1)) / segmentsCount) + 1;

      const segmentPath = path.slice(startIndex, endIndex);
      if (segmentPath.length < 2) continue;

      const t =
        segmentsCount === 1 ? 1 : s / (segmentsCount - 1); // 0 = oldest, 1 = newest
      const opacity =
        oldestOpacity + (newestOpacity - oldestOpacity) * t;

      segments.push({ path: segmentPath, opacity });
    }

    return segments;
  }, [path]);

  // Zoom in → hold → zoom out → hold cycle
  useEffect(() => {
    if (!isLoaded || !ship) return;

    const minZoom = 7;
    const maxZoom = 11; // how close you want to get
    const step = 0.25; // how fast you zoom (bigger = faster)
    const frameMs = 80; // how often we update

    const holdInMs = 4000; // stay zoomed in for 4 seconds
    const holdOutMs = 10000; // stay zoomed out for 10 seconds

    type Phase = "zoomIn" | "holdIn" | "zoomOut" | "holdOut";

    let phase: Phase = "zoomIn";
    let currentZoom = minZoom;
    let holdUntil = 0;

    setZoom(currentZoom);

    const id = setInterval(() => {
      const now = Date.now();

      switch (phase) {
        case "zoomIn": {
          currentZoom = Math.min(maxZoom, currentZoom + step);
          setZoom(currentZoom);

          if (currentZoom >= maxZoom) {
            phase = "holdIn";
            holdUntil = now + holdInMs;
          }
          break;
        }

        case "holdIn": {
          if (now >= holdUntil) {
            phase = "zoomOut";
          }
          break;
        }

        case "zoomOut": {
          currentZoom = Math.max(minZoom, currentZoom - step);
          setZoom(currentZoom);

          if (currentZoom <= minZoom) {
            phase = "holdOut";
            holdUntil = now + holdOutMs;
          }
          break;
        }

        case "holdOut": {
          if (now >= holdUntil) {
            phase = "zoomIn";
          }
          break;
        }
      }
    }, frameMs);

    return () => clearInterval(id);
  }, [isLoaded, ship]);

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
            {/* Fading track: older segments lighter, newer darker */}
            {fadedSegments.map((segment, idx) => (
              <PolylineF
                key={idx}
                path={segment.path}
                options={{
                  geodesic: false,             
                  strokeOpacity: segment.opacity,
                  strokeWeight: 1.5,
                  strokeColor: "#000000",
                  strokeLinecap: "round",      
                  strokeLinejoin: "round",    
                } as google.maps.PolylineOptions
                }
              />

            ))}

            {/* Ship Marker snapped to end of track when needed */}
            <MarkerF position={markerPosition} icon={shipIcon} />
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
