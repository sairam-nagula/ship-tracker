// app/api/paradise-itinerary/route.ts
import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

type ItineraryRow = {
  date: string;
  port: string;
};

export async function GET() {
  try {
    const url =
      "https://www.cruisemapper.com/ships/Margaritaville-Paradise-562?tab=itinerary";

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`CruiseMapper error: ${res.status} ${res.statusText}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const rows: ItineraryRow[] = [];

    // This table is inside: div.cruiseItinerariesCurrent table.table-bordered
    $("div.cruiseItinerariesCurrent table.table.table-bordered tr")
      .slice(1) // skip header row
      .each((_, tr) => {
        const date = $(tr).find("td.date").text().trim();
        const portText = $(tr).find("td.text").text().replace(/\s+/g, " ").trim();

        if (date && portText) {
          rows.push({
            date,
            port: portText,
          });
        }
      });

    return NextResponse.json({ rows }, { status: 200 });
  } catch (err: any) {
    console.error("Error in /api/paradise-itinerary:", err);
    return NextResponse.json(
      {
        error: "Failed to load itinerary",
        details: err?.message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}
