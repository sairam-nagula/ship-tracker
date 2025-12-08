// app/api/quotes/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Quote = {
  text: string;
  author?: string;
};

const QUOTES: Quote[] = [
  { text: "Changes in latitudes, changes in attitudes.", author: "Jimmy Buffett — Changes in Latitudes, Changes in Attitudes" },
  { text: "If we weren’t all crazy, we would go insane.", author: "Jimmy Buffett" },
  { text: "Breathe in, breathe out, move on.", author: "Jimmy Buffett — Breathe In, Breathe Out, Move On" },
  { text: "Some of it’s magic, some of it’s tragic, but I’ve had a good life all the way.", author: "Jimmy Buffett — He Went to Paris" },
  { text: "I like mine with lettuce and tomato, Heinz 57 and French-fried potatoes.", author: "Jimmy Buffett — Cheeseburger in Paradise" },
  { text: "Yes, I am a pirate, two hundred years too late.", author: "Jimmy Buffett — A Pirate Looks at Forty" },
  { text: "Mother, mother ocean, I’ve heard you call.", author: "Jimmy Buffett — A Pirate Looks at Forty" },
  { text: "Trying to reason with hurricane season.", author: "Jimmy Buffett — Trying to Reason with Hurricane Season" },
  { text: "The weather is here, wish you were beautiful.", author: "Jimmy Buffett — The Weather Is Here, Wish You Were Beautiful" },
  { text: "Go fast enough to get there, but slow enough to see.", author: "Jimmy Buffett" },
  { text: "I’d rather die while I’m living than live while I’m dead.", author: "Jimmy Buffett" },
  { text: "Don’t know the reason, stayed here all season.", author: "Jimmy Buffett — Margaritaville" },
  { text: "Some people claim that there’s a woman to blame.", author: "Jimmy Buffett — Margaritaville" },
  { text: "Wasted away again in Margaritaville.", author: "Jimmy Buffett — Margaritaville" },
  { text: "Give me oysters and beer, for dinner every day of the year.", author: "Jimmy Buffett" },
  { text: "A permanent reminder of a temporary feeling.", author: "Jimmy Buffett" },
  { text: "The days drift by, they don’t have names.", author: "Jimmy Buffett" },
  { text: "I’m growing older but not up.", author: "Jimmy Buffett" },
  { text: "It’s a good time for a good time.", author: "Jimmy Buffett" },
  { text: "The horizon is calling.", author: "Jimmy Buffett" },
  { text: "I’m headed for the islands.", author: "Jimmy Buffett" },
  { text: "Living on sponge cake.", author: "Jimmy Buffett — Margaritaville" },
  { text: "A pirate looks at forty.", author: "Jimmy Buffett — A Pirate Looks at Forty" },
  { text: "I don’t know where I’m going, but I know I won’t be bored.", author: "Jimmy Buffett" },
  { text: "Relaxation, inspiration, meditation — island style.", author: "Jimmy Buffett" },
  { text: "Escape is never the wrong answer.", author: "Jimmy Buffett" },
  { text: "The sea doesn’t need anybody but the breeze.", author: "Jimmy Buffett" },
  { text: "I’m growing older, but not up.", author: "Jimmy Buffett" },
  { text: "Somewhere there’s music, how faint the tune.", author: "Jimmy Buffett" },
  { text: "Take it easy, there’s nothing worth losing sleep over.", author: "Jimmy Buffett" },
  { text: "This must be heaven, no place I’d rather be.", author: "Jimmy Buffett — Come Monday" },
];


export function getQuoteOfTheDay(date = new Date()): Quote {
  const msPerDay = 24 * 60 * 60 * 1000;
  const dayNumber = Math.floor(date.getTime() / msPerDay);
  const index = dayNumber % QUOTES.length;
  return QUOTES[index];
}

export async function GET() {
  const quote = getQuoteOfTheDay();
  return NextResponse.json({ quote });
}
