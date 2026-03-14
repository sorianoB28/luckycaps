/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { createJsonRequest, readJson } from "@/test/helpers/http";
import { sqlTextFromArgs } from "@/test/helpers/sql";

const sqlMock = vi.hoisted(() => vi.fn());
const validatePromoCodeMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  default: sqlMock,
  sql: sqlMock,
}));

vi.mock("@/lib/promo", () => ({
  validatePromoCode: validatePromoCodeMock,
}));

import { POST as quotePost } from "@/app/api/checkout/quote/route";

const PRODUCT_ID = "11111111-1111-1111-1111-111111111111";
const productRow = {
  id: PRODUCT_ID,
  slug: "test-cap",
  name: "Test Cap",
  price_cents: 4000,
  sale_price_cents: null,
  original_price_cents: null,
  is_sale: false,
  stock: 10,
  active: true,
  primary_image: null,
  sizes: [] as string[],
};

type QuoteSuccess = {
  ok: true;
  quote: {
    subtotal_cents: number;
    discount_cents: number;
    tax_cents: number;
    shipping_cents: number | null;
    shipping_status: "pending" | "selected";
    total_cents: number | null;
    total_status: "pending" | "ready";
  };
};

type QuoteFailure = {
  ok: false;
  error: string;
  promoError?: { reason?: string } | null;
};

function mockProductLookup() {
  sqlMock.mockImplementation(async (...args: unknown[]) => {
    const text = sqlTextFromArgs(args);
    if (text.includes("FROM public.products p")) {
      return [productRow];
    }
    throw new Error(`Unexpected SQL in checkout quote test: ${text}`);
  });
}

async function requestQuote(params?: { promoCode?: string; shippingOption?: string | null }) {
  const response = await quotePost(
    createJsonRequest("/api/checkout/quote", {
      method: "POST",
      body: {
        items: [{ productId: PRODUCT_ID, quantity: 1 }],
        shippingOption: params?.shippingOption ?? null,
        promoCode: params?.promoCode ?? null,
        currency: "usd",
      },
    })
  );
  return response;
}

describe("API contract: checkout quote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProductLookup();
  });

  it("returns pending shipping/total when shipping is not selected", async () => {
    const response = await requestQuote();
    const payload = await readJson<QuoteSuccess>(response);

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.quote.subtotal_cents).toBe(4000);
    expect(payload.quote.discount_cents).toBe(0);
    expect(payload.quote.tax_cents).toBe(280);
    expect(payload.quote.shipping_status).toBe("pending");
    expect(payload.quote.shipping_cents).toBeNull();
    expect(payload.quote.total_status).toBe("pending");
    expect(payload.quote.total_cents).toBeNull();
    expect(validatePromoCodeMock).not.toHaveBeenCalled();
  });

  it("computes totals when shipping is selected", async () => {
    const response = await requestQuote({ shippingOption: "flat" });
    const payload = await readJson<QuoteSuccess>(response);

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.quote.subtotal_cents).toBe(4000);
    expect(payload.quote.tax_cents).toBe(280);
    expect(payload.quote.shipping_status).toBe("selected");
    expect(payload.quote.shipping_cents).toBe(600);
    expect(payload.quote.total_status).toBe("ready");
    expect(payload.quote.total_cents).toBe(4880);
  });

  it("applies a valid promo and updates tax + total deterministically", async () => {
    validatePromoCodeMock.mockResolvedValue({
      valid: true,
      promo_code_id: "promo-1",
      normalized_code: "E2E1",
      stripe_coupon_id: "coupon_1",
      discount_cents: 100,
    });

    const response = await requestQuote({ promoCode: "E2E1", shippingOption: "flat" });
    const payload = await readJson<QuoteSuccess>(response);

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.quote.subtotal_cents).toBe(4000);
    expect(payload.quote.tax_cents).toBe(273);
    expect(payload.quote.shipping_cents).toBe(600);
    expect(payload.quote.discount_cents).toBe(100);
    expect(payload.quote.total_cents).toBe(4773);
  });

  it.each(["not_found", "inactive", "expired", "min_subtotal"] as const)(
    "returns promo error contract for %s and keeps baseline totals unchanged",
    async (reason) => {
      const baselineResponse = await requestQuote();
      const baseline = await readJson<QuoteSuccess>(baselineResponse);
      expect(baseline.ok).toBe(true);

      validatePromoCodeMock.mockResolvedValueOnce({
        valid: false,
        normalized_code: "E2E_BAD",
        reason,
        ...(reason === "min_subtotal" ? { min_subtotal_cents: 999999 } : {}),
      });

      const invalidResponse = await requestQuote({ promoCode: "E2E_BAD" });
      const invalidPayload = await readJson<QuoteFailure>(invalidResponse);
      expect(invalidResponse.status).toBe(200);
      expect(invalidPayload.ok).toBe(false);
      expect(invalidPayload.error).toBe("Invalid promo code");
      expect(invalidPayload.promoError?.reason).toBe(reason);

      const afterResponse = await requestQuote();
      const after = await readJson<QuoteSuccess>(afterResponse);
      expect(after.ok).toBe(true);
      expect(after.quote.subtotal_cents).toBe(baseline.quote.subtotal_cents);
      expect(after.quote.shipping_cents).toBeNull();
      expect(after.quote.total_cents).toBe(baseline.quote.total_cents);
      expect(after.quote.tax_cents).toBe(baseline.quote.tax_cents);
    }
  );
});
