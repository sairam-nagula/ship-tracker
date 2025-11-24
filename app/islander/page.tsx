"use client";

import { ShipInfoPanel } from "../components/ShipInfoPanel";
import { ShipMap } from "../components/ShipMap";
import { useShipLocation } from "../components/useShipLocation";

export default function IslanderPage() {
  const { ship, error } = useShipLocation(60_000, "islander");

  return (
    <main className="page-root">
      <ShipInfoPanel
        ship={ship}
        error={error}
        logoSrc="/MVAS_Islander Logo.png"
        heroSrc="/islander.jpg"
        shipLabel="MVAS Islander"
      />
      <ShipMap ship={ship} error={error} />
    </main>
  );
}
