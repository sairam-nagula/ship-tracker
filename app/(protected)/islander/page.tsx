"use client";

export const runtime = "nodejs";

import { ShipInfoPanel } from "../../components/ShipInfoPanel";
import { ShipMap } from "../../components/ShipMap";
import { useShipLocation } from "../../components/useShipLocation";
import { useShipTrack } from "../../components/useShipTrack";

export default function IslanderPage() {
  const { ship, error } = useShipLocation(30000, "islander");
  const { track = [] } = useShipTrack("islander");

  return (
    <main className="page-root">
      <ShipInfoPanel
        ship={ship}
        error={error}
        logoSrc="/mvas-logo.png"
        heroSrc="/islander.png"
        shipLabel="Islander"
        itineraryEndpoint="/api/Islander/islander-itinerary"
        cruisenewsEndpoint="/Islander-cruisenews.png"
      />
      <ShipMap ship={ship} error={error} track={track} itineraryEndpoint="/api/Islander/islander-itinerary" />
    </main>
  );
}
