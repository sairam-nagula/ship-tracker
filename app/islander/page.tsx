"use client";

import { ShipInfoPanel } from "../components/ShipInfoPanel";
import { ShipMap } from "../components/ShipMap";
import { useShipLocation } from "../components/useShipLocation";
import { useShipTrack } from "../components/useShipTrack";

export default function IslanderPage() {
  const { ship, error } = useShipLocation(30_000, "islander");
  const { track = [] } = useShipTrack("islander");

  return (
    <main className="page-root">
      <ShipInfoPanel
        ship={ship}
        error={error}
        logoSrc="/MVAS_Islander Logo.png"
        heroSrc="/islander.jpg"
        shipLabel="MVAS Islander"
        itineraryEndpoint="/api/Islander/islander-itinerary"
        cruisenewsEndpoint="/Islander-cruisenews.png"
      />
      <ShipMap ship={ship} track={track} error={error} />
    </main>
  );
}
