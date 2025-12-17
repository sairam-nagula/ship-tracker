// lib/mtnAuth.ts
let cachedToken: string | null = null;
let cachedExpiresAt = 0; 

const AUTH_URL = process.env.MTN_AUTH_URL;
const MTN_USER = process.env.MTN_USER;
const MTN_PASS = process.env.MTN_PASS;

// 60 minutes 
const TOKEN_TTL_MS = 60 * 60 * 1000; 

export async function getMtnToken(): Promise<string> {
  const now = Date.now();

  // Use cached token if still fresh
  if (cachedToken && now < cachedExpiresAt) {
    return cachedToken;
  }

  if (!AUTH_URL || !MTN_USER || !MTN_PASS) {
    throw new Error("MTN_AUTH_URL / MTN_USER / MTN_PASS env vars are missing");
  }

  // Re-login to get a fresh token 
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

  // Cache it for next time
  cachedToken = token;
  cachedExpiresAt = now + TOKEN_TTL_MS;

  return token;
}
