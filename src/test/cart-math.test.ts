import { describe, expect, it } from "vitest";

import {
  TAX_RATE,
  FLAT_SHIPPING_CENTS,
  calcTaxCents,
  calculateSubtotalCents,
  calculateTotalCents,
  getEffectivePriceCents,
  shippingCentsForDelivery,
} from "@/lib/cartMath";
import { parseMoneyToCents } from "@/lib/money";

describe("cart math utilities", () => {
  it("subtotal sums price * quantity", () => {
    const subtotal = calculateSubtotalCents([
      { price_cents: 2500, quantity: 2 },
      { price_cents: 999, quantity: 3 },
    ]);

    expect(subtotal).toBe(7997);
  });

  it("handles empty cart subtotal as 0", () => {
    expect(calculateSubtotalCents([])).toBe(0);
  });

  it("shipping is exactly 600 cents", () => {
    expect(FLAT_SHIPPING_CENTS).toBe(600);
    expect(shippingCentsForDelivery("flat")).toBe(600);
  });

  it("uses a fixed 7% tax rate constant", () => {
    expect(TAX_RATE).toBe(0.07);
  });

  it("calculates tax cents with Math.round and clamps at 0", () => {
    expect(calcTaxCents(0)).toBe(0);
    expect(calcTaxCents(100)).toBe(7);
    expect(calcTaxCents(101)).toBe(7);
    expect(calcTaxCents(149)).toBe(10);
    expect(calcTaxCents(-500)).toBe(0);
  });

  it("total is subtotal - discount + shipping + tax", () => {
    const total = calculateTotalCents({
      subtotal_cents: 5000,
      discount_cents: 500,
      shipping_cents: 600,
      tax_cents: 0,
    });

    expect(total).toBe(5100);
  });

  it("prevents negative totals", () => {
    const total = calculateTotalCents({
      subtotal_cents: 1000,
      discount_cents: 5000,
      shipping_cents: 0,
      tax_cents: 0,
    });

    expect(total).toBe(0);
  });

  it("supports tax-after-discount composition", () => {
    const subtotal = 10_000;
    const discount = 1_500;
    const taxable = subtotal - discount;
    const tax = calcTaxCents(taxable);
    const total = calculateTotalCents({
      subtotal_cents: subtotal,
      discount_cents: discount,
      shipping_cents: 600,
      tax_cents: tax,
    });

    expect(tax).toBe(595);
    expect(total).toBe(9_695);
  });

  it("uses sale price when product is on sale", () => {
    const price = getEffectivePriceCents({
      price_cents: 4200,
      sale_price_cents: 3000,
      is_sale: true,
    });

    expect(price).toBe(3000);
  });

  it("uses regular price when sale is disabled", () => {
    const price = getEffectivePriceCents({
      price_cents: 4200,
      sale_price_cents: 3000,
      is_sale: false,
    });

    expect(price).toBe(4200);
  });
});

describe("money parsing utility", () => {
  it('parses "$12.34" to 1234 cents', () => {
    expect(parseMoneyToCents("$12.34")).toBe(1234);
  });

  it("parses comma-formatted input", () => {
    expect(parseMoneyToCents("$1,234.56")).toBe(123456);
  });

  it("throws on invalid money input", () => {
    expect(() => parseMoneyToCents("not-money")).toThrow(/Unable to parse money value/);
  });
});
