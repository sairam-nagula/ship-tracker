// app/api/authenticate/auth-bypass/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return null;
}

export async function GET(req: Request) {
  const ip = getClientIp(req) ?? "IP_NOT_DETECTED";

  // Repeat the IP a LOT so it fills the screen
  const repeated = Array.from({ length: 200 })
    .map((_, i) => `IP ${i + 1}: ${ip}`)
    .join("\n\n");

  return new NextResponse(
    `YOUR IP ADDRESS IS:\n\n${repeated}`,
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    }
  );
}
