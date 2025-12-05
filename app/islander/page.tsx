"use client";

import { ShipInfoPanel } from "../components/ShipInfoPanel";
import { ShipMap } from "../components/ShipMap";
import { useShipLocation } from "../components/useShipLocation";

export default function IslanderPage() {
  const { ship, track, error } = useShipLocation(30_000, "islander");

  return (
    <main className="page-root">
      <ShipInfoPanel
        ship={ship}
        error={error}
        logoSrc="/MVAS_Islander Logo.png"
        heroSrc="/islander.jpg"
        shipLabel="MVAS Islander"
        itineraryEndpoint="/api/Islander/islander-itinerary"
        dailyHighlightsEndpoint="/api/Islander/daily-highlights"
      />
      <ShipMap ship={ship} track={track} error={error} />
    </main>
  );
}
