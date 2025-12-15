// app/api/Kapture/kapture_auth.ts
import { chromium } from "playwright";

type GetKaptureCookieArgs = {
  loginUrl: string; // use: "https://bahamas.kapturecrm.com/employee/index.html"
  username: string;
  password: string;
};

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
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Match your working Python flow: go to index.html
    await page.goto(loginUrl, { waitUntil: "domcontentloaded" });

    // Match Python selectors/steps:
    // fill_input_field_or_select_option(page, "input[id=username_]", USERNAME)
    await page.locator('input[id="username_"]').fill(username);

    // page.get_by_role("textbox", name="Password").fill(PASSWORD)
    await page.getByRole("textbox", { name: "Password" }).fill(password);

    // page.get_by_role("button", name="Login").click(timeout=15000)
    await page.getByRole("button", { name: "Login" }).click({ timeout: 15000 });

    // Optional: wait a moment for session cookies to be set (Python didn’t wait, but TS often benefits)
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