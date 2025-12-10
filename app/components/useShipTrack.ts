"use client";

import { useEffect, useState } from "react";

// keep it in sync with your API type
export type ShipTrackPoint = {
  lat: number;
  lng: number;
  date: string;
  status: string;
  connectedDevices: number | null;
};

type UseShipTrackResult = {
  track: ShipTrackPoint[];
  error: string | null;
  loading: boolean;
};

export function useShipTrack(
  shipKey: "islander" | "paradise"
): UseShipTrackResult {
  const [track, setTrack] = useState<ShipTrackPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Map ship -> correct API route
    const url =
      shipKey === "islander"
        ? "/api/Islander/islander-trail"
        : "/api/Paradise/paradise-trail";

    async function fetchTrack() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} ${res.statusText}`);
        }

        const data = (await res.json()) as ShipTrackPoint[];

        if (!cancelled) {
          // quick sanity filter so we don't break the map
          setTrack(
            (data || []).filter(
              (p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)
            )
          );
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "Failed to load ship track");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchTrack();

    return () => {
      cancelled = true;
    };
  }, [shipKey]);

  return { track, error, loading };
}
