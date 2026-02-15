import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { gotoAndWait } from "./navigation";
import { waitForAppReady } from "./appReady";

type LoginOptions = {
  signInPath?: string;
  expectedPathname?: string | RegExp;
  email?: string;
  password?: string;
};

function pathnameMatchesExpected(pathname: string, expectedPathname: string) {
  if (expectedPathname === "/") return pathname === "/";
  return pathname === expectedPathname || pathname.startsWith(`${expectedPathname}/`);
}

function readCredentials(options: LoginOptions) {
  const email = options.email?.trim() || process.env.E2E_USER_EMAIL?.trim();
  const password = options.password || process.env.E2E_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Missing E2E credentials. Set E2E_USER_EMAIL and E2E_USER_PASSWORD in .env.local, then rerun npm run test:e2e."
    );
  }

  return { email, password };
}

async function findVisibleLocator(candidates: Locator[], timeout = 15_000) {
  const perCandidateTimeout = Math.max(2_500, Math.floor(timeout / candidates.length));
  for (const candidate of candidates) {
    const locator = candidate.first();
    try {
      await locator.waitFor({ state: "visible", timeout: perCandidateTimeout });
      return locator;
    } catch {
      // try next selector
    }
  }
  return null;
}

export async function login(page: Page, options: LoginOptions = {}) {
  const { email, password } = readCredentials(options);
  const signInPath = options.signInPath ?? "/auth/sign-in";
  const expectedPathname = options.expectedPathname ?? "/";
  const inputTimeout = 20_000;

  await gotoAndWait(page, signInPath, { timeout: 20_000, debugLabel: "sign-in" });
  await expect(page).toHaveURL(/\/auth\/sign-in/);
  await waitForAppReady(page, { timeout: 20_000 });

  const emailInput = await findVisibleLocator(
    [
      page.getByLabel(/email|correo/i),
      page.getByPlaceholder(/you@example\.com|tu@ejemplo\.com/i),
      page.locator('form input[aria-label*="email" i]'),
      page.locator('form input[name="email"]'),
      page.locator('form input[type="email"]'),
      page.locator('input[type="email"]'),
    ],
    inputTimeout
  );
  if (!emailInput) {
    const title = await page.title();
    const snippet = (await page.content()).replace(/\s+/g, " ").slice(0, 500);
    throw new Error(
      `Unable to locate email input on sign-in page. URL: ${page.url()} Title: ${title.slice(
        0,
        500
      )} Snippet: ${snippet} (If navigation failed, check test-results/sign-in-*.html and *.png).`
    );
  }

  const passwordInput = await findVisibleLocator(
    [
      page.getByLabel(/password|contrase/i),
      page.locator('form input[aria-label*="password" i]'),
      page.locator('form input[name="password"]'),
      page.locator('form input[type="password"]'),
      page.locator('input[type="password"]'),
    ],
    inputTimeout
  );
  if (!passwordInput) {
    throw new Error(`Unable to locate password input on sign-in page. URL: ${page.url()}`);
  }

  const submit = page.locator('form button[type="submit"], button[type="submit"]').first();
  await expect(submit).toBeVisible({ timeout: inputTimeout });

  await emailInput.fill(email);
  await passwordInput.fill(password);
  await submit.click();

  if (expectedPathname instanceof RegExp) {
    await expect(page).toHaveURL(expectedPathname, { timeout: 25_000 });
    await waitForAppReady(page, { timeout: 20_000 });
    return;
  }

  await expect(page).toHaveURL(
    (url) => pathnameMatchesExpected(url.pathname, expectedPathname),
    { timeout: 25_000 }
  );
  await waitForAppReady(page, { timeout: 20_000 });
}
