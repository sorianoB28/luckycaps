import { expect, test, type Page, type TestInfo } from "@playwright/test";

import { addFirstActiveProductToCart } from "./helpers/cart";
import { gotoAndWait } from "./helpers/navigation";
import { applyPromoExpectError, readCheckoutTotals, seedPromo } from "./helpers/promo";
import { e2ePromoCode } from "./helpers/run";

test.use({ storageState: undefined });

async function openCheckoutWithSingleItem(page: Page, testInfo: TestInfo, label: string) {
  await addFirstActiveProductToCart(page);
  await gotoAndWait(page, "/checkout", { testInfo, debugLabel: label });

  const subtotal = page.getByTestId("checkout-summary-subtotal-value").first();
  const shipping = page.getByTestId("checkout-summary-shipping-value").first();
  const total = page.getByTestId("checkout-summary-total-value").first();

  await expect(subtotal).toHaveText(/\$\d+\.\d{2}/, { timeout: 20_000 });
  await expect(shipping).toHaveText(/\$6\.00/, { timeout: 20_000 });
  await expect(total).toHaveText(/\$\d+\.\d{2}/, { timeout: 20_000 });

  const before = await readCheckoutTotals(page);
  expect(before.subtotalCents).toBeGreaterThan(0);
  expect(before.shippingCents).toBe(600);
  expect(before.totalCents).toBe((before.subtotalCents ?? 0) + (before.shippingCents ?? 0));
  return before;
}

test("inactive promo shows error and leaves totals unchanged", async ({ page }, testInfo) => {
  const code = e2ePromoCode("INACTIVE");
  await seedPromo(page, { code, type: "amount", value: 1, active: false });

  const before = await openCheckoutWithSingleItem(page, testInfo, "promo-negative-inactive");
  const result = await applyPromoExpectError(page, code);

  expect(result.after.subtotalCents).toBe(before.subtotalCents);
  expect(result.after.shippingCents).toBe(before.shippingCents);
  expect(result.after.totalCents).toBe(before.totalCents);
});

test("expired promo shows error and leaves totals unchanged", async ({ page }, testInfo) => {
  const code = e2ePromoCode("EXPIRED");
  await seedPromo(page, {
    code,
    type: "amount",
    value: 1,
    active: true,
    endsAt: new Date(Date.now() - 60_000).toISOString(),
  });

  const before = await openCheckoutWithSingleItem(page, testInfo, "promo-negative-expired");
  const result = await applyPromoExpectError(page, code);

  expect(result.after.subtotalCents).toBe(before.subtotalCents);
  expect(result.after.shippingCents).toBe(before.shippingCents);
  expect(result.after.totalCents).toBe(before.totalCents);
});

test("min-subtotal promo shows error and leaves totals unchanged", async ({ page }, testInfo) => {
  const code = e2ePromoCode("MIN_SUBTOTAL");
  await seedPromo(page, {
    code,
    type: "amount",
    value: 1,
    active: true,
    minSubtotalCents: 999_999,
  });

  const before = await openCheckoutWithSingleItem(page, testInfo, "promo-negative-min-subtotal");
  const result = await applyPromoExpectError(page, code);

  expect(result.after.subtotalCents).toBe(before.subtotalCents);
  expect(result.after.shippingCents).toBe(before.shippingCents);
  expect(result.after.totalCents).toBe(before.totalCents);
});
