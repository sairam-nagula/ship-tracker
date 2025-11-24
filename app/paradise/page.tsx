"use client";

import { ShipInfoPanel } from "../components/ShipInfoPanel";
import { ShipMap } from "../components/ShipMap";
import { useShipLocation } from "../components/useShipLocation";

export default function ParadisePage() {
  const { ship, error } = useShipLocation(60_000, "paradise");

  return (
    <main className="page-root">
      <ShipInfoPanel
        ship={ship}
        error={error}
        logoSrc="/MVAS_Paradise Logo.png"
        heroSrc="/paradise.jpg" // add this image to /public/paradise.jpg
        shipLabel="MVAS Paradise"
      />
      <ShipMap ship={ship} error={error} />
    </main>
  );
}
