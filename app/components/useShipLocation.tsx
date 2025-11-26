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


export type ShipKey = "islander" | "paradise";

export function useShipLocation(pollMs: number, ship: ShipKey) {
  const [shipData, setShipData] = useState<ShipLocation | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchShip() {
    try {
      setError(null);

      const endpoint =
        ship === "paradise"
          ? "api/Paradise/paradise-ship-location"
          : "api/Islander/islander-ship-location"; 

      const res = await fetch(endpoint, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const data = (await res.json()) as ShipLocation;
      setShipData(data);
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

  return { ship: shipData, error };
}
