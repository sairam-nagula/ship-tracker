// app/api/Islander/daily-highlights/route.ts
import { NextResponse } from "next/server";

// pdfreader: CommonJS require
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PdfReader } = require("pdfreader");

export const runtime = "nodejs"; // IMPORTANT: Node runtime

const PDF_URL =
  "https://dygjeuxqaprt3.cloudfront.net/margaritavilleatsea.com-1166063475/cms/pressroom/04_islander_cozumel_1205.pdf?_ga-ft=aTLuaQ.AA.AA.AA.AA.FqrluIlhS1Gha3dhamphVw..0.MVISLANDER.";

type HighlightItem = {
  section: string;     // e.g. "SUNRISE SPOTLIGHTS"
  time: string;        // "10:00am"
  title: string;       // "MORNING MINDBENDER TRIVIA"
  location: string;    // "Far Side of the World | Deck 2 Fwd"
  description: string; // paragraph text
};

// ---------- PDF → text helper ----------

function extractTextFromPdf(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const lines: string[] = [];

    new PdfReader().parseBuffer(buffer, (err: Error | null, item: any) => {
      if (err) {
        reject(err);
        return;
      }

      // item === null => end of file
      if (!item) {
        resolve(lines.join("\n"));
        return;
      }

      if (item.text) {
        lines.push(item.text);
      }
    });
  });
}

// ---------- Text → HighlightItem[] parser ----------

function parseHighlights(text: string): HighlightItem[] {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const sectionHeaders = [
    "SUNRISE SPOTLIGHTS",
    "AFTERNOON ADVENTURES",
    "MARGARITAVILLE AFTER DARK",
  ];
  const headerSet = new Set(sectionHeaders);

  const isTimeLine = (line: string) => /^\d{1,2}:\d{2}/.test(line);

  const items: HighlightItem[] = [];
  let currentSection = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upper = line.toUpperCase();

    // 1) Section headers
    if (headerSet.has(upper)) {
      currentSection = upper; // store as uppercase for consistent matching
      continue;
    }

    if (!currentSection) continue; // ignore stuff before the first section

    // 2) Time + location line (more forgiving)
    if (isTimeLine(line)) {
      // Title is the previous non-empty line that is not a header or time line
      let title = "Highlight";
      for (let j = i - 1; j >= 0; j--) {
        const prev = lines[j];
        const prevUpper = prev.toUpperCase();
        if (!prev || headerSet.has(prevUpper) || isTimeLine(prev)) break;
        title = prev;
        break;
      }

      // Extract time (first HH:MM with optional am/pm)
      const timeMatch =
        /^(\d{1,2}:\d{2}\s*(?:am|pm|AM|PM)?)/.exec(line) || undefined;
      const time = timeMatch ? timeMatch[1].trim() : "";

      // Location = everything after the first '|' if present
      let location = "";
      const pipeIndex = line.indexOf("|");
      if (pipeIndex !== -1) {
        location = line.slice(pipeIndex + 1).trim();
      }

      // Description lines: everything after this until the next time line or section header
      const descLines: string[] = [];
      let k = i + 1;
      while (k < lines.length) {
        const l2 = lines[k];
        const l2Upper = l2.toUpperCase();
        if (headerSet.has(l2Upper) || isTimeLine(l2)) break;
        descLines.push(l2);
        k++;
      }

      items.push({
        section: currentSection,
        time,
        title: title.trim(),
        location,
        description: descLines.join(" "),
      });

      i = k - 1; // skip over the description we just consumed
    }
  }

  return items;
}

// ---------- API handler ----------

export async function GET() {
  try {
    const pdfRes = await fetch(PDF_URL);
    if (!pdfRes.ok) {
      throw new Error(`PDF fetch failed: ${pdfRes.status}`);
    }

    const arrayBuffer = await pdfRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const text = await extractTextFromPdf(buffer);
    const highlights = parseHighlights(text);

    return NextResponse.json({ highlights });
  } catch (err: any) {
    console.error("Daily highlights error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load daily highlights" },
      { status: 500 }
    );
  }
}
