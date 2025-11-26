// lib/mtnAuth.ts
let cachedToken: string | null = null;
let cachedExpiresAt = 0; // ms timestamp

const AUTH_URL = process.env.MTN_AUTH_URL;
const MTN_USER = process.env.MTN_USER;
const MTN_PASS = process.env.MTN_PASS;

// How long we *trust* a token for (ms).
// If MTN tokens last 24h, you can safely use, say, 23h here.
const TOKEN_TTL_MS = 55 * 60 * 1000; // 55 minutes for now

export async function getMtnToken(): Promise<string> {
  const now = Date.now();

  // 1) Use cached token if still "fresh"
  if (cachedToken && now < cachedExpiresAt) {
    return cachedToken;
  }

  if (!AUTH_URL || !MTN_USER || !MTN_PASS) {
    throw new Error("MTN_AUTH_URL / MTN_USER / MTN_PASS env vars are missing");
  }

  // 2) Re-login to get a fresh token (same logic as your Python script)
  const payload = new URLSearchParams({
    username: MTN_USER,
    password: MTN_PASS,
  });

  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: {
      accept: "application/json, text/plain, */*",
      "accept-language": "en-US,en;q=0.9",
      authorization: "Bearer null",
      "content-type": "application/x-www-form-urlencoded",
      origin: "https://customer.fmcglobalsat.com",
      referer: "https://customer.fmcglobalsat.com/",
      // UA can be whatever; doesn’t have to match browser exactly
      "user-agent": "mwas-ship-tracker/1.0",
    },
    body: payload.toString(),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `MTN auth error: ${res.status} ${res.statusText} ${text}`,
    );
  }

  const json = (await res.json()) as { jwt_token?: string };
  const token = json.jwt_token;

  if (!token) {
    throw new Error("MTN auth response missing jwt_token");
  }

  // 3) Cache it for next time
  cachedToken = token;
  cachedExpiresAt = now + TOKEN_TTL_MS;

  return token;
}
