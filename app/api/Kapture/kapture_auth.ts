// app/api/Kapture/kapture_auth.ts
import { chromium as playwrightChromium } from "playwright-core";
import chromium from "@sparticuz/chromium";

type GetKaptureCookieArgs = {
  loginUrl: string;
  username: string;
  password: string;
};

const WINDOWS_CHROME_PATH =
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

function cookiesToHeader(cookies: Array<{ name: string; value: string }>) {
  return cookies
    .filter((c) => c?.name && c?.value)
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}

export async function getKaptureCookieHeader({
  loginUrl,
  username,
  password,
}: GetKaptureCookieArgs): Promise<string> {
  const isServerless = !!process.env.VERCEL || process.platform === "linux";

  const browser = isServerless
    ? await playwrightChromium.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: true,
      })
    : await playwrightChromium.launch({
        executablePath: WINDOWS_CHROME_PATH,
        headless: true,
      });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  const page = await context.newPage();

  try {
    await page.goto(loginUrl, { waitUntil: "domcontentloaded" });

    await page.locator('input[id="username_"]').fill(username);
    await page.getByRole("textbox", { name: "Password" }).fill(password);

    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded" }).catch(() => null),
      page.getByRole("button", { name: "Login" }).click({ timeout: 15000 }),
    ]);

    await page.waitForLoadState("networkidle").catch(() => null);

    const cookies = await context.cookies();
    const header = cookiesToHeader(cookies);

    if (!header || header.trim().length < 10) {
      throw new Error("No cookies found after login (cookie header empty).");
    }

    return header;
  } finally {
    await context.close().catch(() => null);
    await browser.close().catch(() => null);
  }
}
