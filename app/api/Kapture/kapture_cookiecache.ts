// lib/kaptureCookieCache.ts
let cachedCookie: string | null = null;
let cachedAtMs: number = 0;

const MAX_AGE_MS = 12 * 60 * 60 * 1000; // 23 hours

export async function getCachedKaptureCookie(getFresh: () => Promise<string>) {
  const now = Date.now();
  if (cachedCookie && now - cachedAtMs < MAX_AGE_MS) return cachedCookie;

  const fresh = await getFresh();
  cachedCookie = fresh;
  cachedAtMs = now;
  return fresh;
}