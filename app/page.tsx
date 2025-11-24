"use client";

import Link from "next/link";
import { ShipMap } from "./components/ShipMap";
import { useShipLocation } from "./components/useShipLocation";



export default function HomePage() {
  // get islander and paradise ship location every 30 seconds (30000ms)
    const {
    ship: islanderShip,
    error: islanderError,
  } = useShipLocation(30000, "islander");

  const {
    ship: paradiseShip,
    error: paradiseError,
  } = useShipLocation(30000, "paradise");


  return (
    <main className="home-root">
      <div className="home-inner">
        <h1 className="home-title">Margaritaville at Sea – Ship Tracker</h1>
        <p className="home-subtitle">
          Choose a vessel to view its live position and status.
        </p>

        <div className="home-grid">
          {/* Islander card */}
          <section className="home-ship-card">
            <header className="home-ship-header">
              <div className="home-ship-info">
                <img
                  src="/MVAS_Islander Logo.png"
                  alt="MVAS Islander"
                  className="ship-choice-logo"
                />
                <div className="home-ship-text">
                  <h2 className="ship-choice-name">MVAS Islander</h2>
                  <p className="home-ship-sub">
                    Live position preview for Islander.
                  </p>
                </div>
              </div>

              <Link href="/islander" className="home-ship-button">
                View Islander Page
              </Link>
            </header>

            <div className="home-map-wrapper">
              <ShipMap ship={islanderShip} error={islanderError} />
            </div>
          </section>

          {/* Paradise card */}
          <section className="home-ship-card">
            <header className="home-ship-header">
              <div className="home-ship-info">
                <img
                  src="/MVAS_Paradise Logo.png"
                  alt="MVAS Paradise"
                  className="ship-choice-logo"
                />
                <div className="home-ship-text">
                  <h2 className="ship-choice-name">MVAS Paradise</h2>
                  <p className="home-ship-sub">
                    Live position preview for Paradise.
                  </p>
                </div>
              </div>

              <Link href="/paradise" className="home-ship-button">
                View Paradise Page
              </Link>
            </header>

            <div className="home-map-wrapper">
              <ShipMap ship={paradiseShip} error={paradiseError} />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
