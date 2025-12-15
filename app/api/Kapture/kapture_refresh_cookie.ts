import { NextResponse } from "next/server";
import { getKaptureCookieHeader } from "./kapture_auth";

export async function GET() {
  try {
    const loginUrl = process.env.KAPTURE_LOGIN_URL || "";
    const username = process.env.KAPTURE_USERNAME || "";
    const password = process.env.KAPTURE_PASSWORD || "";

    if (!loginUrl || !username || !password) {
      return NextResponse.json(
        { error: "Missing KAPTURE_LOGIN_URL / KAPTURE_USERNAME / KAPTURE_PASSWORD env vars" },
        { status: 500 }
      );
    }

    const cookieHeader = await getKaptureCookieHeader({ loginUrl, username, password });

    // For security: don’t expose this publicly.
    // Consider locking this route behind a secret token, IP allowlist, or remove it entirely and call helper directly server-side.
    return NextResponse.json({ cookieHeader }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to refresh Kapture cookie", details: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}