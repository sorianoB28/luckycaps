import { expect, test, type Page } from "@playwright/test";

import { loginAsAdmin } from "./helpers/admin";
import { waitForAppReady } from "./helpers/appReady";
import { gotoAndWait } from "./helpers/navigation";

const MISSING_TRANSLATION_TOKEN = "MISSING_TRANSLATION:";

test.use({ storageState: undefined });

function hasAdminCredentials() {
  const email =
    process.env.E2E_ADMIN_EMAIL?.trim() || process.env.E2E_USER_EMAIL?.trim() || "";
  const password = process.env.E2E_ADMIN_PASSWORD || process.env.E2E_USER_PASSWORD || "";
  return Boolean(email && password);
}

async function switchToSpanish(page: Page) {
  const currentLanguage = await page
    .evaluate(() => window.localStorage.getItem("luckycaps.language"))
    .catch(() => null);
  if (currentLanguage === "ES") return;

  const spanishButton = page
    .locator('header button[aria-label*="Spanish" i], header button[aria-label*="espa" i]')
    .first();
  if (await spanishButton.isVisible().catch(() => false)) {
    await spanishButton.click();
    const switched = await page
      .waitForFunction(
        () => window.localStorage.getItem("luckycaps.language") === "ES",
        undefined,
        { timeout: 3_000 }
      )
      .then(() => true)
      .catch(() => false);
    if (switched) return;
  }

  const esTextButton = page.locator("header button").filter({ hasText: /^ES$/ }).first();
  if (await esTextButton.isVisible().catch(() => false)) {
    await esTextButton.click();
    const switched = await page
      .waitForFunction(
        () => window.localStorage.getItem("luckycaps.language") === "ES",
        undefined,
        { timeout: 3_000 }
      )
      .then(() => true)
      .catch(() => false);
    if (switched) return;
  }

  await page.evaluate(() => window.localStorage.setItem("luckycaps.language", "ES"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForAppReady(page, { timeout: 20_000 });
}

async function expectNoMissingTranslations(page: Page, label: string) {
  await expect
    .poll(async () => {
      const bodyText = await page.locator("body").innerText();
      return bodyText.includes(MISSING_TRANSLATION_TOKEN);
    })
    .toBeFalsy();

  const bodyText = await page.locator("body").innerText();
  if (bodyText.includes(MISSING_TRANSLATION_TOKEN)) {
    const snippetIndex = bodyText.indexOf(MISSING_TRANSLATION_TOKEN);
    const snippet = bodyText.slice(Math.max(0, snippetIndex - 80), snippetIndex + 200);
    throw new Error(`Missing translation marker found on ${label}: ${snippet}`);
  }
}

async function getFirstProductSlug(page: Page) {
  const response = await page.request.get("/api/products");
  if (!response.ok()) {
    throw new Error(`/api/products failed with status ${response.status()}`);
  }

  const products = (await response.json()) as Array<{
    slug?: string;
    active?: boolean;
    stock?: number;
  }>;

  const first = products.find(
    (product) => Boolean(product.slug) && (product.active ?? true) && (product.stock ?? 0) > 0
  );
  if (!first?.slug) {
    throw new Error("No active in-stock product found for i18n smoke test.");
  }
  return first.slug;
}

test("i18n smoke: ES pages render without missing translation markers", async ({ page }, testInfo) => {
  test.setTimeout(120_000);

  await gotoAndWait(page, "/", { testInfo, debugLabel: "i18n-home" });
  await switchToSpanish(page);
  await expectNoMissingTranslations(page, "/");

  await gotoAndWait(page, "/shop", { testInfo, debugLabel: "i18n-shop" });
  await expectNoMissingTranslations(page, "/shop");

  const slug = await getFirstProductSlug(page);
  await gotoAndWait(page, `/product/${slug}`, { testInfo, debugLabel: `i18n-product-${slug}` });
  await expectNoMissingTranslations(page, `/product/${slug}`);

  await gotoAndWait(page, "/checkout", { testInfo, debugLabel: "i18n-checkout" });
  await expectNoMissingTranslations(page, "/checkout");

  if (hasAdminCredentials()) {
    await loginAsAdmin(page);
    await expect(page).toHaveURL((url) => url.pathname.startsWith("/admin"), {
      timeout: 30_000,
    });
    await expectNoMissingTranslations(page, "/admin");
  }
});
