"use client";

import { useEffect, useState } from "react";

export type ShipLocation = {
  name: string;
  lat: number;
  lng: number;
  lastUpdated: string;
  speedKts: number | null;
  courseDeg: number | null;
  headingDeg: number | null;

  // OpenWeather fields
  weatherTempC: number | null;
  weatherDescription: string | null;
  weatherIcon: string | null;
};

export type ShipTrackPoint = {
  lat: number;
  lng: number;
  date: string;
  status: string;
  connectedDevices: number | null;
};

export type ShipKey = "islander" | "paradise";

export function useShipLocation(pollMs: number, ship: ShipKey) {
  const [shipData, setShipData] = useState<ShipLocation | null>(null);
  const [track, setTrack] = useState<ShipTrackPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function fetchShip() {
    try {
      setError(null);

      const endpoint =
        ship === "paradise"
          ? "api/Paradise/paradise-ship-location"
          : "api/Islander/islander-ship-location";

      // 1) Fetch current ship location
      const res = await fetch(endpoint, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      const data = (await res.json()) as ShipLocation;
      setShipData(data);

      // 2) If this is Islander, also fetch the trail history
      if (ship === "islander") {
        const trackRes = await fetch("api/Islander/islander-trail", {
          cache: "no-store",
        });

        if (trackRes.ok) {
          const raw = await trackRes.json();

          if (Array.isArray(raw)) {
            const cleaned: ShipTrackPoint[] = raw
              .map((row: any) => {
                const lat = Number(row.lat);
                const lng = Number(row.lng);
                if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

                return {
                  lat,
                  lng,
                  date:
                    typeof row.date === "string"
                      ? row.date
                      : new Date().toISOString(),
                  status: String(row.status ?? ""),
                  connectedDevices:
                    row.connected_devices != null
                      ? Number(row.connected_devices)
                      : null,
                };
              })
              .filter((p: ShipTrackPoint | null): p is ShipTrackPoint => p !== null)
              .sort((a, b) => a.date.localeCompare(b.date)); // oldest → newest

            setTrack(cleaned);
          } else {
            setTrack([]);
          }
        } else {
          // don’t kill the whole hook if track fails; just log it
          console.error(
            "Failed to load Islander track",
            trackRes.status,
            trackRes.statusText
          );
        }
      } else {
        // no track for Paradise (for now)
        setTrack([]);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Failed to load ship location");
    }
  }

  useEffect(() => {
    let cancel = false;

    async function initial() {
      if (!cancel) await fetchShip();
    }

    initial();

    const id = setInterval(() => {
      if (!cancel) fetchShip();
    }, pollMs);

    return () => {
      cancel = true;
      clearInterval(id);
    };
  }, [pollMs, ship]);

  return { ship: shipData, track, error };
}
