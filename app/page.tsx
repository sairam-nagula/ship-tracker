// app/page.tsx
"use client";

import { ShipInfoPanel } from "./components/ShipInfoPanel";
import { ShipMap } from "./components/ShipMap";
import { useShipLocation } from "./components/useShipLocation";

export default function HomePage() {
  const { ship, error } = useShipLocation(60_000);

  return (
    <main className="page-root">
      <ShipInfoPanel ship={ship} error={error} />
      <ShipMap ship={ship} error={error} />
    </main>
  );
}
