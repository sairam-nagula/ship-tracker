// app/api/Paradise/paradise-itinerary/route.ts
import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { getKaptureCookieHeader } from "@/app/api/Kapture/kapture_auth";
import { geocodePlace } from "@/app/api/Kapture/geocode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;


type ItineraryRow = {
  date: string;
  port: string;
  lat: number | null;
  lng: number | null;
};

const TZ = "America/New_York";

// Turnaround cutoff (NY time)
const SWITCH_CUTOFF_HH = 11;
const SWITCH_CUTOFF_MM = 30;

function getNowNY(): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);

  return { y, m, d };
}

function getNowNYFull(): { y: number; m: number; d: number; hh: number; mm: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);
  const hh = Number(parts.find((p) => p.type === "hour")?.value);
  const mm = Number(parts.find((p) => p.type === "minute")?.value);

  return { y, m, d, hh, mm };
}

function isBeforeCutoffNY(now: { hh: number; mm: number }): boolean {
  if (now.hh < SWITCH_CUTOFF_HH) return true;
  if (now.hh > SWITCH_CUTOFF_HH) return false;
  return now.mm < SWITCH_CUTOFF_MM;
}

function monthNameToNum(mon: string): number | null {
  const map: Record<string, number> = {
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    oct: 10,
    nov: 11,
    dec: 12,
  };
  const key = mon.trim().toLowerCase().slice(0, 3);
  return map[key] ?? null;
}

function ymdToKey(y: number, m: number, d: number): number {
  return y * 10000 + m * 100 + d;
}

function parseSailingRangeText(
  text: string,
  calYear: number,
  calMonth: number
): { startYMD: number; endYMD: number } | null {
  const raw = (text || "").replace(/\s+/g, " ").trim();
  if (!raw) return null;

  const m1 =
    /^(\d{1,2})\s+([A-Za-z]{3})\s*-\s*(\d{1,2})\s+([A-Za-z]{3})$/.exec(raw);
  if (m1) {
    const sd = Number(m1[1]);
    const sm = monthNameToNum(m1[2]);
    const ed = Number(m1[3]);
    const em = monthNameToNum(m1[4]);
    if (!sm || !em) return null;

    let sy = calYear;
    let ey = calYear;

    if (sm !== calMonth) {
      if (calMonth === 1 && sm === 12) sy = calYear - 1;
      else if (calMonth === 12 && sm === 1) sy = calYear + 1;
    }

    if (em !== calMonth) {
      if (calMonth === 12 && em === 1) ey = calYear + 1;
      else if (calMonth === 1 && em === 12) ey = calYear - 1;
    }

    if (sy === ey && ymdToKey(sy, sm, sd) > ymdToKey(ey, em, ed)) {
      ey = sy + 1;
    }

    return {
      startYMD: ymdToKey(sy, sm, sd),
      endYMD: ymdToKey(ey, em, ed),
    };
  }

  return null;
}

async function fetchMonthWiseHtml(
  cookie: string,
  cruiseId: string,
  calMonth: number,
  calYear: number
): Promise<string> {
  const url =
    "https://bahamas.kapturecrm.com/employee/get-cruise-sailing-details-month-wise-ajax";

  const body = new URLSearchParams();
  body.set("cruise_id", cruiseId);
  body.set("cal_month", String(calMonth));
  body.set("cal_year", String(calYear));

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "*/*",
      Origin: "https://bahamas.kapturecrm.com",
      Referer:
        "https://bahamas.kapturecrm.com/employee/cruise-sailing-details.html",
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15",
      Cookie: cookie,
    },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Month-wise API error: ${res.status} ${res.statusText}`);
  }

  return await res.text();
}

async function getCurrentSailingId(
  cookie: string,
  cruiseId: string
): Promise<string | null> {
  const now = getNowNYFull();
  const target = ymdToKey(now.y, now.m, now.d);
  const beforeCutoff = isBeforeCutoffNY(now);

  const candidates: Array<{ y: number; m: number }> = [
    { y: now.y, m: now.m },
    { y: now.m === 1 ? now.y - 1 : now.y, m: now.m === 1 ? 12 : now.m - 1 },
    { y: now.m === 12 ? now.y + 1 : now.y, m: now.m === 12 ? 1 : now.m + 1 },
  ];

  type Match = { id: string; startYMD: number; endYMD: number };

  for (const c of candidates) {
    const html = await fetchMonthWiseHtml(cookie, cruiseId, c.m, c.y);
    const $ = cheerio.load(html);

    const table = $("table.sailing_details_table");
    if (!table.length) continue;

    const matches: Match[] = [];

    table.find("tbody tr").each((_, tr) => {
      const tds = $(tr).find("td");
      if (tds.length < 3) return;

      const idText = $(tds[0]).text().replace(/\s+/g, " ").trim();
      const dateText = $(tds[2]).text().replace(/\s+/g, " ").trim();

      const id = /^\d+$/.test(idText) ? idText : null;
      if (!id) return;

      const range = parseSailingRangeText(dateText, c.y, c.m);
      if (!range) return;

      if (target >= range.startYMD && target <= range.endYMD) {
        matches.push({ id, startYMD: range.startYMD, endYMD: range.endYMD });
      }
    });

    if (!matches.length) continue;

    if (matches.length === 1) return matches[0].id;

    const startsToday = matches.filter((m) => m.startYMD === target);
    const endsToday = matches.filter((m) => m.endYMD === target && m.startYMD < target);

    if (startsToday.length > 0 && endsToday.length > 0) {
      if (beforeCutoff) {
        endsToday.sort((a, b) => b.startYMD - a.startYMD);
        return endsToday[0].id;
      } else {
        startsToday.sort((a, b) => a.endYMD - b.endYMD);
        return startsToday[0].id;
      }
    }

    matches.sort((a, b) => b.startYMD - a.startYMD);
    return matches[0].id;
  }

  return null;
}

function parseMDY(dateStr: string): { y: number; m: number; d: number } | null {
  const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/.exec(dateStr);
  if (!m) return null;
  const mm = Number(m[1]);
  const dd = Number(m[2]);
  const yy = Number(m[3]);
  if (!Number.isFinite(mm) || !Number.isFinite(dd) || !Number.isFinite(yy))
    return null;
  return { y: yy, m: mm, d: dd };
}

function daysBetweenUTC(
  a: { y: number; m: number; d: number },
  b: { y: number; m: number; d: number }
): number {
  const A = Date.UTC(a.y, a.m - 1, a.d);
  const B = Date.UTC(b.y, b.m - 1, b.d);
  return Math.floor((A - B) / 86400000);
}


type CookieCache = {
  cookie: string;
  expiresAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __KAPTURE_COOKIE_CACHE__: CookieCache | undefined;
}

const COOKIE_TTL_MS = 12 * 60 * 60 * 1000;

async function getCachedKaptureCookie(): Promise<string> {
  const now = Date.now();
  const cached = globalThis.__KAPTURE_COOKIE_CACHE__;
  if (cached && cached.cookie && cached.expiresAt > now) {
    return cached.cookie;
  }

  const cookie =
    process.env.KAPTURE_COOKIE ||
    (await getKaptureCookieHeader({
      loginUrl: process.env.KAPTURE_LOGIN_URL!,
      username: process.env.KAPTURE_USERNAME!,
      password: process.env.KAPTURE_PASSWORD!,
    }));

  if (!cookie) throw new Error("Unable to obtain Kapture cookie");

  globalThis.__KAPTURE_COOKIE_CACHE__ = {
    cookie,
    expiresAt: now + COOKIE_TTL_MS,
  };

  return cookie;
}

async function fetchWithKaptureCookie(
  url: string,
  init: RequestInit,
  cookie: string
): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Cookie: cookie,
    },
    cache: "no-store",
  });

  // If cookie expired server-side, refresh once and retry
  if (res.status === 401 || res.status === 403) {
    globalThis.__KAPTURE_COOKIE_CACHE__ = undefined;
    const fresh = await getCachedKaptureCookie();
    return await fetch(url, {
      ...init,
      headers: {
        ...(init.headers || {}),
        Cookie: fresh,
      },
      cache: "no-store",
    });
  }

  return res;
}

export async function GET(req: Request) {
  try {
    const itineraryUrl =
      "https://bahamas.kapturecrm.com/employee/show-itinerary-details-ajax";

    const { searchParams } = new URL(req.url);

    const cookie = await getCachedKaptureCookie();

    const cruiseId =
      searchParams.get("cruise_id") || process.env.KAPTURE_CRUISE_ID || "61";

    let sailingId =
      searchParams.get("sailing_id") || process.env.KAPTURE_SAILING_ID || "";

    if (!sailingId) {
      const auto = await getCurrentSailingId(cookie, cruiseId);
      if (!auto) {
        return NextResponse.json(
          { error: "Could not determine current sailing_id" },
          { status: 500 }
        );
      }
      sailingId = auto;
    }

    const body = new URLSearchParams();
    body.set("sailing_id", sailingId);

    const res = await fetchWithKaptureCookie(
      itineraryUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Accept: "*/*",
          Origin: "https://bahamas.kapturecrm.com",
          Referer:
            "https://bahamas.kapturecrm.com/employee/cruise-sailing-details.html",
          "X-Requested-With": "XMLHttpRequest",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15",
        },
        body,
      },
      cookie
    );

    if (!res.ok) {
      throw new Error(`Kapture itinerary error: ${res.status} ${res.statusText}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const table = $("table.table.table-bordered");
    if (!table.length) {
      throw new Error("No itinerary table found");
    }

    const rowsNoGeo: Array<{ date: string; port: string }> = [];

    table
      .find("tr")
      .slice(1)
      .each((_, tr) => {
        const tds = $(tr).find("td");
        if (tds.length < 2) return;

        const date = $(tds[0]).text().replace(/\s+/g, " ").trim();
        const portName = $(tds[1]).text().replace(/\s+/g, " ").trim();
        const arrive =
          tds.length >= 4 ? $(tds[3]).text().replace(/\s+/g, " ").trim() : "";
        const depart =
          tds.length >= 5 ? $(tds[4]).text().replace(/\s+/g, " ").trim() : "";

        if (!date || !portName) return;

        const timePart =
          arrive || depart
            ? ` ${arrive || ""}${arrive && depart ? " - " : ""}${depart || ""}`
            : "";

        rowsNoGeo.push({
          date: `${date}${timePart}`.trim(),
          port: portName,
        });
      });

    const uniquePorts = Array.from(new Set(rowsNoGeo.map((r) => r.port)));

    const portToLatLng = new Map<string, { lat: number; lng: number }>();

    for (const port of uniquePorts) {
      const ll = await geocodePlace(port);
      if (ll) portToLatLng.set(port, ll);
    }

    const rows: ItineraryRow[] = rowsNoGeo.map((r) => {
      const ll = portToLatLng.get(r.port) ?? null;
      return {
        date: r.date,
        port: r.port,
        lat: ll ? ll.lat : null,
        lng: ll ? ll.lng : null,
      };
    });

    const sailingStartMDY = rows.length
      ? parseMDY(rows[0].date.split(" ")[0])
      : null;

    const todayNY = getNowNY();

    const sailingStartDateISO = sailingStartMDY
      ? `${String(sailingStartMDY.y).padStart(4, "0")}-${String(
          sailingStartMDY.m
        ).padStart(2, "0")}-${String(sailingStartMDY.d).padStart(2, "0")}`
      : null;

    const rawIndex =
      sailingStartMDY != null ? daysBetweenUTC(todayNY, sailingStartMDY) : null;

    const currentDayIndex =
      rawIndex == null ? null : Math.max(0, Math.min(rows.length - 1, rawIndex));

    return NextResponse.json(
  { rows, sailingId, sailingStartDateISO, currentDayIndex },
  {
    status: 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  }
);

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
