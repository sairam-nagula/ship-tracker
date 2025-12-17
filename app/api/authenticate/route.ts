// app/api/authenticate/auth-bypass/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    return xff.split(",")[0].trim();
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return null;
}

function isBypassIp(ip: string | null): boolean {
  if (!ip) return false;

  const raw = process.env.AUTH_BYPASS_IPS || "";
  const allowed = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return allowed.includes(ip);
}

export async function GET(req: Request) {
  const ip = getClientIp(req);
  const bypass = isBypassIp(ip);

  return NextResponse.json({
    bypass,
    ip,
  });
}
