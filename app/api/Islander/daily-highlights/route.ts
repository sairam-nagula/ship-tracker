// app/api/Islander/daily-highlights/route.ts
import { NextResponse } from "next/server";

// CommonJS require for pdfreader
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PdfReader } = require("pdfreader");

export const runtime = "nodejs"; // pdfreader needs Node runtime

const PDF_URL =
  "https://dygjeuxqaprt3.cloudfront.net/margaritavilleatsea.com-1166063475/cms/pressroom/04_islander_cozumel_1205.pdf?_ga-ft=aTLuaQ.AA.AA.AA.AA.FqrluIlhS1Gha3dhamphVw..0.MVISLANDER.";

type HighlightItem = {
  section: string;   // e.g. "SUNRISE SPOTLIGHTS"
  time: string;      // "10:00am"
  title: string;     // "MORNING MINDBENDER TRIVIA"
  location: string;  // "Far Side of the World | Deck 2 Fwd"
  description: string;
};

/**
 * STEP 1: PDF buffer -> logical lines of text.
 * We group by page + y coordinate, then sort by x so the sentence is in order.
 */
function extractTextFromPdf(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    type Cell = { x: number; text: string };
    const rows: Record<string, Cell[]> = {};

    new PdfReader().parseBuffer(buffer, (err: Error | null, item: any) => {
      if (err) {
        reject(err);
        return;
      }

      // item === null -> end of file
      if (!item) {
        const keys = Object.keys(rows).sort((a, b) => {
          const [pa, ya] = a.split(":").map(Number);
          const [pb, yb] = b.split(":").map(Number);
          if (pa !== pb) return pa - pb;
          return ya - yb;
        });

        const lines: string[] = [];

        for (const key of keys) {
          const cells = rows[key].sort((a, b) => a.x - b.x);
          const line = cells.map((c) => c.text).join(" ");
          const trimmed = line.trim();
          if (trimmed.length > 0) lines.push(trimmed);
        }

        resolve(lines.join("\n"));
        return;
      }

      if (item.text) {
        const page = item.page || 0;
        const y = item.y || 0;
        const key = `${page}:${y}`;
        if (!rows[key]) rows[key] = [];
        rows[key].push({ x: item.x, text: item.text });
      }
    });
  });
}

/**
 * STEP 2: Lines -> HighlightItem[]
 * We ignore "DAILY HIGHLIGHTS" / "SCHEDULE" and just start once we hit
 * one of the real highlight section headers.
 */
function parseHighlights(text: string): HighlightItem[] {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const normalize = (s: string) => s.toUpperCase().replace(/\s+/g, " ").trim();

  const rawSectionHeaders = [
    "SUNRISE SPOTLIGHTS",
    "AFTERNOON ADVENTURES",
    "MARGARITAVILLE AFTER DARK",
  ];

  const sectionHeaders = rawSectionHeaders.map(normalize);
  const headerSet = new Set(sectionHeaders);

  // Map normalized -> pretty label
  const headerMap = new Map<string, string>();
  rawSectionHeaders.forEach((h) => headerMap.set(normalize(h), h));

  const isTimeLine = (line: string) => /^\d{1,2}:\d{2}/.test(line);

  const items: HighlightItem[] = [];
  let currentSection = "";
  let insideHighlights = false;

  console.log("========== RAW LINES (first 60) ==========");
  lines.slice(0, 60).forEach((ln, idx) =>
    console.log(idx.toString().padStart(3), ":", JSON.stringify(ln))
  );

  console.log("========== BEGIN PARSE LOOP ==========");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const norm = normalize(line);

    // Section headers turn "insideHighlights" on
    if (headerSet.has(norm)) {
      insideHighlights = true;
      currentSection = headerMap.get(norm) ?? norm;
      console.log(">>> FOUND SECTION:", currentSection, "at index", i);
      continue;
    }

    if (!insideHighlights || !currentSection) continue;

    // Time + location line
    if (isTimeLine(line)) {
      console.log(">>> TIME ENTRY:", line, "SECTION:", currentSection);

      // Title = previous non-header, non-time line
      let title = "Highlight";
      for (let j = i - 1; j >= 0; j--) {
        const prev = lines[j];
        const prevNorm = normalize(prev);
        if (!prev || headerSet.has(prevNorm) || isTimeLine(prev)) break;
        title = prev.trim();
        break;
      }

      // Time (HH:MM + optional am/pm – first occurrence)
      const timeMatch =
        /^(\d{1,2}:\d{2}\s*(?:am|pm|AM|PM)?)/.exec(line) || undefined;
      const time = timeMatch ? timeMatch[1].trim() : "";

      // Location = the part after the first '|', if present
      let location = "";
      const pipeIndex = line.indexOf("|");
      if (pipeIndex !== -1) {
        location = line.slice(pipeIndex + 1).trim();
      }

      // Description: following lines until next section header or next time line
      const descLines: string[] = [];
      let k = i + 1;
      while (k < lines.length) {
        const l2 = lines[k];
        const l2Norm = normalize(l2);
        if (headerSet.has(l2Norm)) break;
        if (isTimeLine(l2)) break;
        descLines.push(l2);
        k++;
      }

      items.push({
        section: currentSection,
        time,
        title,
        location,
        description: descLines.join(" "),
      });

      i = k - 1; // skip over description block we just consumed
    }
  }

  console.log("========== PARSE COMPLETE ==========");
  console.log("Total items parsed:", items.length);
  console.log("Sections in results:", [...new Set(items.map((i) => i.section))]);

  return items;
}

// -------- API handler --------

export async function GET() {
  try {
    console.log("\n\n=============== DAILY HIGHLIGHTS API HIT ===============");

    const pdfRes = await fetch(PDF_URL);
    console.log("PDF STATUS:", pdfRes.status);

    const arrayBuffer = await pdfRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const text = await extractTextFromPdf(buffer);
    const highlights = parseHighlights(text);

    console.log(">>> RETURNING", highlights.length, "HIGHLIGHTS");

    return NextResponse.json({ highlights });
  } catch (err: any) {
    console.error("Daily highlights error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load daily highlights" },
      { status: 500 }
    );
  }
}
