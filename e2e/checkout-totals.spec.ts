import { expect, test } from "@playwright/test";

import { addFirstActiveProductToCart } from "./helpers/cart";
import { selectFlatShipping } from "./helpers/checkout";
import { gotoAndWait } from "./helpers/navigation";

function parseMoney(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, "").trim();
  if (!cleaned) {
    throw new Error(`Unable to parse money value from \"${value}\"`);
  }

  const amount = Number.parseFloat(cleaned);
  if (Number.isNaN(amount)) {
    throw new Error(`Money value is not numeric: \"${value}\"`);
  }

  return Math.round(amount * 100);
}

test.use({ storageState: undefined });

test("add to cart -> checkout summary totals are correct", async ({ page }, testInfo) => {
  await addFirstActiveProductToCart(page);
  await gotoAndWait(page, "/checkout", { testInfo, debugLabel: "checkout" });

  const lineItem = page.getByTestId("checkout-line-item").first();
  await expect(lineItem).toBeVisible({ timeout: 20_000 });

  const subtotalValue = page.getByTestId("checkout-subtotal-value").first();
  const taxValue = page.getByTestId("checkout-tax-value").first();
  const shippingValue = page.getByTestId("checkout-shipping-value").first();
  const totalValue = page.getByTestId("checkout-total-value").first();
  const payButton = page.getByTestId("checkout-pay-button").first();

  await expect(subtotalValue).toHaveText(/\$\d+\.\d{2}/, { timeout: 20_000 });
  await expect(taxValue).toHaveText(/\$\d+\.\d{2}/, { timeout: 20_000 });
  await expect(shippingValue).toHaveText(/TBD/i, { timeout: 20_000 });
  await expect(totalValue).toHaveText(/TBD/i, { timeout: 20_000 });
  await expect(payButton).toBeDisabled();

  const subtotalCents = parseMoney((await subtotalValue.textContent()) ?? "");
  const taxCents = parseMoney((await taxValue.textContent()) ?? "");

  expect(subtotalCents).toBeGreaterThan(0);
  expect(taxCents).toBe(Math.round(subtotalCents * 0.07));

  await selectFlatShipping(page);

  const shippingCents = parseMoney((await shippingValue.textContent()) ?? "");
  const totalCents = parseMoney((await totalValue.textContent()) ?? "");

  expect(shippingCents).toBe(600);
  expect(totalCents).toBe(subtotalCents + taxCents + shippingCents);
  await expect(payButton).toBeEnabled();
});
