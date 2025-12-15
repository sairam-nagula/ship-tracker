"use client";

import { GoogleMap, MarkerF, PolylineF } from "@react-google-maps/api";
import type { ShipLocation } from "./useShipLocation";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
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

type ItineraryRow = {
  date: string;
  port: string;
  lat: number | string | null;
  lng: number | string | null;
};

type Props = {
  ship: ShipLocation | null;
  error: string | null;
  track?: ShipTrackPoint[];
  itineraryEndpoint?: string;
};

const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID;

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function ShipMap({ ship, error, track = [], itineraryEndpoint }: Props) {
  const { isLoaded } = useGoogleMapsLoader();

  const [itineraryRows, setItineraryRows] = useState<ItineraryRow[]>([]);
  const [itineraryDayIndex, setItineraryDayIndex] = useState<number | null>(null);

  const mapRef = useRef<google.maps.Map | null>(null);

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const shipCenter =
    ship && Number.isFinite(ship.lat) && Number.isFinite(ship.lng)
      ? { lat: ship.lat, lng: ship.lng }
      : { lat: 0, lng: 0 };

  const heading = ship?.courseDeg ?? 0;

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

  const path = useMemo(
    () =>
      (track || [])
        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
        .map((p) => ({ lat: p.lat, lng: p.lng })),
    [track]
  );

  const markerPosition = useMemo(() => {
    if (!path.length) return shipCenter;

    const last = path[path.length - 1];
    const epsilon = 0.0001;

    const isSameAsShipCenter =
      Math.abs(last.lat - shipCenter.lat) < epsilon &&
      Math.abs(last.lng - shipCenter.lng) < epsilon;

    return isSameAsShipCenter ? shipCenter : last;
  }, [path, shipCenter.lat, shipCenter.lng]);

  const center = markerPosition;

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

  useEffect(() => {
    if (!itineraryEndpoint) {
      setItineraryRows([]);
      setItineraryDayIndex(null);
      return;
    }

    const url = itineraryEndpoint;

    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`Itinerary API error: ${res.status}`);

        const json = await res.json();

        const rowsRaw = Array.isArray(json?.rows) ? json.rows : [];
        const idx = typeof json?.currentDayIndex === "number" ? json.currentDayIndex : null;

        if (!cancelled) {
          setItineraryRows(rowsRaw as ItineraryRow[]);
          setItineraryDayIndex(idx);
        }
      } catch (e) {
        console.error("Itinerary load failed:", e);
        if (!cancelled) {
          setItineraryRows([]);
          setItineraryDayIndex(null);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [itineraryEndpoint]);

  const itineraryMarkers = useMemo(() => {
    return (itineraryRows || [])
      .map((r, i) => {
        const lat = toNumber(r.lat);
        const lng = toNumber(r.lng);
        if (lat === null || lng === null) return null;

        return {
          key: `${r.port}-${i}`,
          port: r.port,
          pos: { lat, lng },
          isActive: itineraryDayIndex === i,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [itineraryRows, itineraryDayIndex]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!ship || !Number.isFinite(ship.lat) || !Number.isFinite(ship.lng)) return;
    if (itineraryMarkers.length === 0) return;

    const bounds = new google.maps.LatLngBounds();

    bounds.extend({ lat: ship.lat, lng: ship.lng });

    for (const m of itineraryMarkers) {
      bounds.extend(m.pos);
    }

    map.fitBounds(bounds, 40);

    const once = google.maps.event.addListenerOnce(map, "bounds_changed", () => {
      const z = map.getZoom();
      if (typeof z === "number" && z > 9) map.setZoom(9);
    });

    return () => {
      google.maps.event.removeListener(once);
    };
  }, [itineraryMarkers, ship]);

  const destinationIcon = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    const g = (window as any).google?.maps;
    if (!g) return undefined;

    return {
      url: "/destination-marker.png",
      scaledSize: new g.Size(28, 28),
      anchor: new g.Point(14, 28),
    };
  }, [isLoaded]);

  const destinationIconActive = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    const g = (window as any).google?.maps;
    if (!g) return undefined;

    return {
      url: "/destination-marker.png",
      scaledSize: new g.Size(38, 38),
      anchor: new g.Point(19, 38),
    };
  }, [isLoaded]);

  return (
    <section className="map-pane">
      <div className="map-card">
        {isLoaded && ship ? (
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
                options={{
                  geodesic: false,
                  strokeOpacity: segment.opacity,
                  strokeWeight: 1.5,
                  strokeColor: "#000000",
                  strokeLinecap: "round",
                  strokeLinejoin: "round",
                } as google.maps.PolylineOptions}
              />
            ))}

            {itineraryMarkers.map((m) => (
              <MarkerF
                key={m.key}
                position={m.pos}
                icon={m.isActive ? destinationIconActive : destinationIcon}
                options={{
                  clickable: false,
                  zIndex: m.isActive ? 30 : 10,
                }}
              />
            ))}

            <MarkerF position={markerPosition} icon={shipIcon} />
          </GoogleMap>
        ) : (
          <div className="map-loading">{error ? `Error: ${error}` : "Loading map…"}</div>
        )}

        <img src="/mvas-logo.png" alt="MVAS Logo" className="map-watermark-logo" />
      </div>
    </section>
  );
}