import { expect, test, type Page } from "@playwright/test";

import { addFirstActiveProductToCart } from "./helpers/cart";
import { gotoAndWait } from "./helpers/navigation";
import { e2eEmail } from "./helpers/run";

async function fillCheckoutEmail(page: Page, value: string) {
  const candidates = [
    page.getByLabel(/email|correo/i).first(),
    page.locator('input[type="email"]').first(),
    page.locator('input[placeholder*="example" i]').first(),
  ];

  for (const input of candidates) {
    try {
      await input.waitFor({ state: "visible", timeout: 8_000 });
      await input.fill(value);
      return;
    } catch {
      // try next input selector
    }
  }

  throw new Error(`Unable to find checkout email input on ${page.url()}`);
}

test.use({ storageState: undefined });

test("checkout creates stripe session", async ({ page }, testInfo) => {
  const stamp = Date.now();

  await addFirstActiveProductToCart(page);
  await gotoAndWait(page, "/checkout", { testInfo, debugLabel: "checkout-session" });

  const autofillButton = page.getByTestId("checkout-autofill").first();
  await expect(autofillButton).toBeVisible({ timeout: 20_000 });
  await autofillButton.click();

  await fillCheckoutEmail(page, e2eEmail(`checkout-${stamp}`));

  const placeOrderButton = page.getByTestId("checkout-place-order").first();
  await expect(placeOrderButton).toBeEnabled({ timeout: 30_000 });

  const checkoutResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes("/api/checkout")
  );

  await placeOrderButton.click();

  const checkoutResponse = await checkoutResponsePromise;
  expect(checkoutResponse.ok()).toBeTruthy();

  let body: Record<string, unknown> | null = null;
  try {
    body = (await checkoutResponse.json()) as Record<string, unknown>;
  } catch {
    body = null;
  }

  const sessionUrl =
    (typeof body?.sessionUrl === "string" && body.sessionUrl) ||
    (typeof body?.url === "string" && body.url) ||
    null;

  const responseIndicatesStripe = Boolean(
    sessionUrl && /https:\/\/checkout\.stripe\.com\//i.test(sessionUrl)
  );

  let navigatedToStripe = false;
  try {
    await page.waitForURL(/checkout\.stripe\.com/i, { timeout: 15_000 });
    navigatedToStripe = true;
  } catch {
    navigatedToStripe = false;
  }

  expect(responseIndicatesStripe || navigatedToStripe).toBeTruthy();
});
