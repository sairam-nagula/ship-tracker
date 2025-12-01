"use client";
 
import { GoogleMap, MarkerF } from "@react-google-maps/api";
import { useMemo, useState, useEffect } from "react";
import type { ShipLocation } from "./useShipLocation";
import { useGoogleMapsLoader } from "./useGoogleMapsLoader";
 
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
  const { isLoaded } = useGoogleMapsLoader();
 
  const [zoom, setZoom] = useState(7);        
  const [targetZoom, setTargetZoom] = useState(7);
 
  const center =
    ship && Number.isFinite(ship.lat) && Number.isFinite(ship.lng)
      ? { lat: ship.lat, lng: ship.lng }
      : { lat: 0, lng: 0 };
 
  const heading = ship?.courseDeg ?? 0;
 
  // Triangle ship icon
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
 
  // Every 30 seconds, flip the target zoom between 7 and 10
  useEffect(() => {
    if (!isLoaded || !ship) return;
 
    const interval = setInterval(() => {
      setTargetZoom((prev) => (prev === 7 ? 10 : 7));
    }, 30_000);
 
    return () => clearInterval(interval);
  }, [isLoaded, ship]);
 
  // Smoothly animate zoom toward targetZoom
  useEffect(() => {
    if (!isLoaded) return;
 
    const step = 0.15;     // zoom step size
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
 