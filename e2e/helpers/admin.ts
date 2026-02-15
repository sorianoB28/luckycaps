import { expect, type Locator, type Page } from "@playwright/test";

import { gotoAndWait } from "./navigation";
import { waitForAppReady } from "./appReady";
import { e2eEmail } from "./run";

type AdminCredentials = {
  email: string;
  password: string;
  seed: boolean;
};

function readAdminCredentials(): AdminCredentials {
  const email = process.env.E2E_ADMIN_EMAIL?.trim();
  const password = process.env.E2E_ADMIN_PASSWORD;

  if (email && password) {
    return { email, password, seed: false };
  }

  const fallbackPassword = process.env.E2E_USER_PASSWORD;
  if (!fallbackPassword) {
    throw new Error(
      "Missing admin E2E credentials. Set E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD or provide E2E_USER_PASSWORD for fallback admin seeding."
    );
  }

  return {
    email: e2eEmail("admin"),
    password: fallbackPassword,
    seed: true,
  };
}

async function findVisibleLocator(candidates: Locator[], timeout = 20_000) {
  const perCandidateTimeout = Math.max(2_500, Math.floor(timeout / candidates.length));
  for (const candidate of candidates) {
    const locator = candidate.first();
    try {
      await locator.waitFor({ state: "visible", timeout: perCandidateTimeout });
      return locator;
    } catch {
      // try next candidate
    }
  }
  return null;
}

async function seedAdminUser(page: Page, credentials: AdminCredentials) {
  const response = await page.request.post("/api/dev/seed-admin", {
    data: {
      email: credentials.email,
      password: credentials.password,
      first_name: "E2E",
      last_name: "Admin",
    },
  });

  if (!response.ok()) {
    const text = await response.text();
    throw new Error(
      `Unable to seed admin user for E2E login. Status ${response.status()}. Response: ${text}`
    );
  }
}

export async function loginAsAdmin(page: Page) {
  const credentials = readAdminCredentials();

  if (credentials.seed) {
    await seedAdminUser(page, credentials);
  }

  await gotoAndWait(page, "/auth/sign-in?redirect=/admin", {
    timeout: 25_000,
    debugLabel: "admin-sign-in",
  });
  await waitForAppReady(page, { timeout: 20_000 });

  const emailInput = await findVisibleLocator([
    page.getByLabel(/email|correo/i),
    page.locator('form input[name="email"]'),
    page.locator('form input[type="email"]'),
    page.locator('input[type="email"]'),
  ]);
  if (!emailInput) {
    throw new Error(`Unable to locate email input on admin sign-in. URL: ${page.url()}`);
  }

  const passwordInput = await findVisibleLocator([
    page.getByLabel(/password|contrase/i),
    page.locator('form input[name="password"]'),
    page.locator('form input[type="password"]'),
    page.locator('input[type="password"]'),
  ]);
  if (!passwordInput) {
    throw new Error(`Unable to locate password input on admin sign-in. URL: ${page.url()}`);
  }

  await emailInput.fill(credentials.email);
  await passwordInput.fill(credentials.password);

  const submitButton = page.locator('form button[type="submit"], button[type="submit"]').first();
  await expect(submitButton).toBeVisible({ timeout: 20_000 });
  await submitButton.click();

  await expect(page).toHaveURL((url) => url.pathname.startsWith("/admin"), {
    timeout: 30_000,
  });
  await waitForAppReady(page, { timeout: 20_000 });
}

export async function goToAdminProducts(page: Page) {
  await gotoAndWait(page, "/admin", { timeout: 25_000, debugLabel: "admin-products" });
  await expect(page).toHaveURL((url) => url.pathname.startsWith("/admin"), {
    timeout: 20_000,
  });
  await expect(page.locator("table").first()).toBeVisible({ timeout: 20_000 });
}
