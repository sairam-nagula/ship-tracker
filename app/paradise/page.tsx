"use client";

import { ShipInfoPanel } from "../components/ShipInfoPanel";
import { ShipMap } from "../components/ShipMap";
import { useShipLocation } from "../components/useShipLocation";
import { useShipTrack } from "../components/useShipTrack";

export default function ParadisePage() {
  const { ship, error } = useShipLocation(30_000, "paradise");
  const { track = [] } = useShipTrack("paradise");

  return (
    <main className="page-root">
      <ShipInfoPanel
        ship={ship}
        error={error}
        logoSrc="/MVAS_Paradise Logo.png"
        heroSrc="/paradise.jpg" 
        shipLabel="MVAS Paradise"
        itineraryEndpoint="/api/Paradise/paradise-itinerary"
        cruisenewsEndpoint="/Paradise-cruisenews.png"
      />
      <ShipMap ship={ship} track={track} error={error} />
    </main>
  );
}
