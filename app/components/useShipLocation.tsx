// components/useShipLocation.ts
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
};

export function useShipLocation(pollMs: number = 60_000) {
  const [ship, setShip] = useState<ShipLocation | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchShipLocation() {
    try {
      setError(null);
      const res = await fetch("/api/ship-location");
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      const data = (await res.json()) as ShipLocation;
      setShip(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load ship location");
    }
  }

  useEffect(() => {
    fetchShipLocation();

    const id = setInterval(fetchShipLocation, pollMs);
    return () => clearInterval(id);
  }, [pollMs]);

  return { ship, error };
}
