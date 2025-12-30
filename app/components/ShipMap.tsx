"use client";

import type { ShipLocation } from "./useShipLocation";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useGoogleMapsLoader } from "./useGoogleMapsLoader";
import { GoogleMap, MarkerF, PolylineF, OverlayViewF } from "@react-google-maps/api";


const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const dashedLineSymbol = {
  path: "M 0,-.5 0,3",
  strokeOpacity: .4,
  strokeWeight: 2,
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

function ItinLabelOverlay({
  pos,
  text,
  isActive,
}: {
  pos: { lat: number; lng: number };
  text: string;
  isActive: boolean;
}) {
  return (
    <OverlayViewF
      position={pos}
      mapPaneName="overlayLayer"
    >
      <div className={`gm-itin-label ${isActive ? "is-active" : "is-faded"}`}>
        {text}
      </div>
    </OverlayViewF>
  );
}





function toNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function isAtSea(port: string | null | undefined): boolean {
  const s = (port || "").toLowerCase().trim();
  return s.includes("at sea");
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

  let cancelled = false;
  let intervalId: any = null;

  async function load() {
    try {
      const res = await fetch(itineraryEndpoint!, { cache: "no-store" });
      if (!res.ok) throw new Error(`Itinerary API error: ${res.status}`);

      const json = await res.json();

      const rowsRaw = Array.isArray(json?.rows) ? json.rows : [];
      const idx = typeof json?.currentDayIndex === "number" ? json.currentDayIndex : null;

      if (!cancelled) {
        setItineraryRows(rowsRaw as ItineraryRow[]);
        setItineraryDayIndex(idx);

        //  debug:
        // console.log("ShipMap itinerary refresh:", { sailingId: json?.sailingId, currentDayIndex: idx });
      }
    } catch (e) {
      console.error("Itinerary load failed:", e);
      if (!cancelled) {
        setItineraryRows([]);
        setItineraryDayIndex(null);
      }
    }
  }

  // 1) load immediately
  load();

  // 2) poll every 60s (adjust if you want)
  intervalId = setInterval(load, 60_000);

  // 3) refresh when tab comes back
  const onVis = () => {
    if (document.visibilityState === "visible") load();
  };
  document.addEventListener("visibilitychange", onVis);
  window.addEventListener("focus", load);

  return () => {
    cancelled = true;
    if (intervalId) clearInterval(intervalId);
    document.removeEventListener("visibilitychange", onVis);
    window.removeEventListener("focus", load);
  };
}, [itineraryEndpoint]);

const itineraryMarkers = useMemo(() => {
  const keyFor = (lat: number, lng: number) => {
    // Round so tiny float differences don't create "fake" uniques
    const rLat = Math.round(lat * 10_000) / 10_000;
    const rLng = Math.round(lng * 10_000) / 10_000;
    return `${rLat}|${rLng}`;
  };

  const byPos = new Map<
    string,
    {
      key: string;
      port: string;
      pos: { lat: number; lng: number };
      isActive: boolean;
      index: number;
    }
  >();

  for (let i = 0; i < (itineraryRows || []).length; i++) {
    const r = itineraryRows[i];
    const lat = toNumber(r.lat);
    const lng = toNumber(r.lng);
    if (lat === null || lng === null) continue;

    const posKey = keyFor(lat, lng);
    const candidate = {
      key: `${r.port}-${i}`,
      port: r.port,
      pos: { lat, lng },
      isActive: itineraryDayIndex === i,
      index: i,
    };

    const existing = byPos.get(posKey);

    // Keep the active one if either is active; otherwise keep the earliest
    if (!existing) {
      byPos.set(posKey, candidate);
    } else if (!existing.isActive && candidate.isActive) {
      byPos.set(posKey, candidate);
    } else if (!existing.isActive && !candidate.isActive && candidate.index < existing.index) {
      byPos.set(posKey, candidate);
    }
  }

  // Keep original itinerary order (by index)
  return Array.from(byPos.values()).sort((a, b) => a.index - b.index);
}, [itineraryRows, itineraryDayIndex]);



  // Keep the map framing to include ship + all itinerary markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!ship || !Number.isFinite(ship.lat) || !Number.isFinite(ship.lng)) return;
    if (itineraryMarkers.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    bounds.extend({ lat: ship.lat, lng: ship.lng });

    for (const m of itineraryMarkers) bounds.extend(m.pos);

    map.fitBounds(bounds, 280);
  }, [itineraryMarkers, ship]);

  const destinationIcon = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    const g = (window as any).google?.maps;
    if (!g) return undefined;

    return {
      url: "/destination-marker.png",
      scaledSize: new g.Size(30, 30),
      anchor: new g.Point(10, 20),
    };
  }, [isLoaded]);


  const shipMarkerIcon = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    const g = (window as any).google?.maps;
    if (!g) return undefined;

    const WIDTH = 47;
    const HEIGHT = 62;
    const SCALE = 0.8;

    return {
      url: "/ship-marker-navy.png",
      scaledSize: new g.Size(WIDTH * SCALE, HEIGHT * SCALE),
      anchor: new g.Point((WIDTH * SCALE) / 2, HEIGHT * SCALE),
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

            {itineraryMarkers.map((m) => {
              const dayNum = m.index + 1;
              const totalDays = itineraryRows.length;

              let labelText: string;

              if (m.index === 0 || m.index === totalDays - 1) {
                labelText = m.port;
              } else {
                labelText = `Day ${m.index + 1} | ${m.port}`;
              }


              return (
                <div key={m.key}>
                  <MarkerF
                    position={m.pos}
                    icon={destinationIcon}
                    options={{
                      clickable: false,
                      zIndex: m.isActive ? 30 : 10,
                    }}
                  />

                  <ItinLabelOverlay
                    pos={m.pos}
                    text={labelText}
                    isActive={m.isActive}
                  />
                </div>
              );
            })}




          

            <MarkerF
              position={markerPosition}
              icon={shipMarkerIcon}
              options={{
                zIndex: 9999,
              }}
            />

          </GoogleMap>
        ) : (
          <div className="map-loading">{error ? `Error: ${error}` : "Loading map…"}</div>
        )}

        <img src="/mvas-logo.png" alt="MVAS Logo" className="map-watermark-logo" />
      </div>
    </section>
  );
}
