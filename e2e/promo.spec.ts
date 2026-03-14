import { expect, test } from "@playwright/test";

import { addFirstActiveProductToCart } from "./helpers/cart";
import { selectFlatShipping } from "./helpers/checkout";
import { gotoAndWait } from "./helpers/navigation";
import { applyPromoOnCheckout, seedPromo } from "./helpers/promo";
import { e2ePromoCode } from "./helpers/run";

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

test("apply promo code updates checkout totals", async ({ page }, testInfo) => {
  const promoCode = e2ePromoCode("ONE");
  await seedPromo(page, {
    code: promoCode,
    type: "amount",
    value: 1,
    valueCents: 100,
    active: true,
  });

  await addFirstActiveProductToCart(page);
  await gotoAndWait(page, "/checkout", { testInfo, debugLabel: "checkout-promo" });

  const lineItem = page.getByTestId("checkout-line-item").first();
  await expect(lineItem).toBeVisible({ timeout: 20_000 });

  const subtotalValue = page.getByTestId("checkout-summary-subtotal-value").first();
  const taxValue = page.getByTestId("checkout-tax-value").first();
  const shippingValue = page.getByTestId("checkout-summary-shipping-value").first();
  const totalValue = page.getByTestId("checkout-summary-total-value").first();

  await expect(subtotalValue).toHaveText(/\$\d+\.\d{2}/, { timeout: 20_000 });
  await expect(taxValue).toHaveText(/\$\d+\.\d{2}/, { timeout: 20_000 });
  await expect(shippingValue).toHaveText(/TBD/i, { timeout: 20_000 });
  await expect(totalValue).toHaveText(/TBD/i, { timeout: 20_000 });

  const subtotalBefore = parseMoney((await subtotalValue.textContent()) ?? "");
  const taxBefore = parseMoney((await taxValue.textContent()) ?? "");

  expect(subtotalBefore).toBeGreaterThan(0);
  expect(taxBefore).toBe(Math.round(subtotalBefore * 0.07));

  await selectFlatShipping(page);

  const shippingBefore = parseMoney((await shippingValue.textContent()) ?? "");
  const totalBefore = parseMoney((await totalValue.textContent()) ?? "");

  expect(shippingBefore).toBe(600);
  expect(totalBefore).toBe(subtotalBefore + shippingBefore + taxBefore);

  await applyPromoOnCheckout(page, promoCode);

  const subtotalAfter = parseMoney((await subtotalValue.textContent()) ?? "");
  const taxAfter = parseMoney((await taxValue.textContent()) ?? "");
  const shippingAfter = parseMoney((await shippingValue.textContent()) ?? "");
  const totalAfter = parseMoney((await totalValue.textContent()) ?? "");

  expect(subtotalAfter).toBe(subtotalBefore);
  expect(taxAfter).toBeLessThanOrEqual(taxBefore);
  expect(shippingAfter).toBe(600);
  expect(totalAfter).toBeLessThan(totalBefore);

  const discountRow = page.getByTestId("checkout-summary-discount-row").first();
  const hasDiscountRow = await discountRow.isVisible().catch(() => false);
  if (hasDiscountRow) {
    const discountValue = page.getByTestId("checkout-summary-discount-value").first();
    const discountAfter = Math.abs(parseMoney((await discountValue.textContent()) ?? ""));
    expect(discountAfter).toBeGreaterThan(0);
    expect(totalAfter).toBe(subtotalAfter + shippingAfter + taxAfter - discountAfter);
  }
});
