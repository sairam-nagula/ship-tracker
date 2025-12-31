"use client";

import { GoogleMap, MarkerF, PolylineF, OverlayViewF } from "@react-google-maps/api";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import type { ShipLocation } from "../components/useShipLocation";

export type ShipTrackPoint = {
  lat: number;
  lng: number;
  date: string;
};

type Props = {
  ship: ShipLocation | null;
  error: string | null;
  isLoaded: boolean;
  track?: ShipTrackPoint[];
  // optional: only if you later want itinerary markers on homepage too
  // itineraryEndpoint?: string;
};

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID;

export function HomeShipMap({ ship, error, isLoaded, track = [] }: Props) {
  const mapRef = useRef<google.maps.Map | null>(null);

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  // Raw ship center from live data
  const shipCenter =
    ship && Number.isFinite(ship.lat) && Number.isFinite(ship.lng)
      ? { lat: ship.lat, lng: ship.lng }
      : { lat: 0, lng: 0 };

  // Build a simple path directly from track
  const path = useMemo(
    () =>
      (track || [])
        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
        .map((p) => ({ lat: p.lat, lng: p.lng })),
    [track]
  );

  // Same "snap ship marker to end of track unless basically identical" logic
  const markerPosition = useMemo(() => {
    if (!path.length) return shipCenter;

    const last = path[path.length - 1];
    const epsilon = 0.0001;

    const isSameAsShipCenter =
      Math.abs(last.lat - shipCenter.lat) < epsilon &&
      Math.abs(last.lng - shipCenter.lng) < epsilon;

    return isSameAsShipCenter ? shipCenter : last;
  }, [path, shipCenter.lat, shipCenter.lng]);

  // Use markerPosition as the map center (same behavior as ShipMap)
  const center = markerPosition;

  // Same faded segments logic
  const fadedSegments = useMemo(() => {
    if (path.length < 2) return [];

    const maxSegments = 10;
    const segmentsCount = Math.min(maxSegments, path.length - 1);
    const segments: { path: { lat: number; lng: number }[]; opacity: number }[] = [];

    const oldestOpacity = 0.15;
    const newestOpacity = 0.9;

    for (let s = 0; s < segmentsCount; s++) {
      const startIndex = Math.floor((s * (path.length - 1)) / segmentsCount);
      const endIndex = Math.floor(((s + 1) * (path.length - 1)) / segmentsCount) + 1;

      const segmentPath = path.slice(startIndex, endIndex);
      if (segmentPath.length < 2) continue;

      const t = segmentsCount === 1 ? 1 : s / (segmentsCount - 1);
      const opacity = oldestOpacity + (newestOpacity - oldestOpacity) * t;

      segments.push({ path: segmentPath, opacity });
    }

    return segments;
  }, [path]);

  // MATCH SHIPMAP: use the same ship marker image (not the arrow)
  const shipMarkerIcon = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    const g = (window as any).google?.maps;
    if (!g) return undefined;

    const WIDTH = 47;
    const HEIGHT = 62;
    const SCALE = 0.5;

    return {
      url: "/ship-marker-navy.png",
      scaledSize: new g.Size(WIDTH * SCALE, HEIGHT * SCALE),
      anchor: new g.Point((WIDTH * SCALE) / 2, HEIGHT * SCALE),
    };
  }, [isLoaded]);

  // OPTIONAL: if you ever want to add destination markers on the homepage too,
  // you can reuse this exact icon from ShipMap later.
  // const destinationIcon = useMemo(() => {
  //   if (typeof window === "undefined") return undefined;
  //   const g = (window as any).google?.maps;
  //   if (!g) return undefined;
  //   return {
  //     url: "/destination-marker.png",
  //     scaledSize: new g.Size(30, 30),
  //     anchor: new g.Point(10, 20),
  //   };
  // }, [isLoaded]);

  // MATCH SHIPMAP: remove the zoom cycling for the homepage preview.
  // Instead, let the map frame to the available track (ship + path).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!ship || !Number.isFinite(ship.lat) || !Number.isFinite(ship.lng)) return;

    // If you have enough track to bound, use bounds. Otherwise just set a reasonable zoom.
    if (path.length >= 2) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: ship.lat, lng: ship.lng });
      for (const p of path) bounds.extend(p);
      map.fitBounds(bounds, 80); // keep it tighter since it's a small card
    } else {
      map.setCenter(center);
      map.setZoom(8);
    }
  }, [ship, path, center]);

  if (!isLoaded || !ship) {
    return <div className="map-loading">{error ? `Error: ${error}` : "Loading map…"}</div>;
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={6}
      onLoad={handleMapLoad}
      options={{
        mapId: MAP_ID,
        disableDefaultUI: true,
        zoomControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        keyboardShortcuts: false,
        clickableIcons: false,

        // MATCH SHIPMAP: same light water/land look
        styles: [
          { featureType: "water", elementType: "geometry", stylers: [{ color: "#dff1fb" }] },
          { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#b2d0df" }] },
          { featureType: "administrative", elementType: "labels", stylers: [{ visibility: "off" }] },
          { featureType: "poi", stylers: [{ visibility: "off" }] },
          { featureType: "road", stylers: [{ visibility: "off" }] },
        ],
      }}
    >
      {fadedSegments.map((segment, idx) => (
        <PolylineF
          key={idx}
          path={segment.path}
          options={
            {
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

      <MarkerF
        position={markerPosition}
        icon={shipMarkerIcon}
        options={{
          zIndex: 9999,
        }}
      />
    </GoogleMap>
  );
}
