import { expect, test } from "@playwright/test";

import { addFirstActiveProductToCart } from "./helpers/cart";
import { gotoAndWait } from "./helpers/navigation";

test.use({ storageState: undefined });

test("shop shows graceful fallback when /api/products fails", async ({ page }, testInfo) => {
  await gotoAndWait(page, "/shop?e2e_fail=products", {
    testInfo,
    debugLabel: "shop-api-products-failure",
  });

  const errorCard = page.getByTestId("shop-products-error").first();
  await expect(errorCard).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("shop-products-error-text").first()).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByTestId("shop-products-retry").first()).toBeVisible({
    timeout: 20_000,
  });
});

test("checkout shows graceful fallback when /api/checkout/quote fails", async ({
  page,
}, testInfo) => {
  await addFirstActiveProductToCart(page);
  await gotoAndWait(page, "/checkout?e2e_fail=checkout_quote", {
    testInfo,
    debugLabel: "checkout-api-quote-failure",
  });

  const errorCard = page.getByTestId("checkout-quote-error").first();
  await errorCard.scrollIntoViewIfNeeded();
  await expect(errorCard).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("checkout-quote-error-text").first()).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByTestId("checkout-quote-retry").first()).toBeVisible({
    timeout: 20_000,
  });
});

