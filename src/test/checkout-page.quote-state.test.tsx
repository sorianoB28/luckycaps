import React from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CheckoutPage from "@/app/checkout/page";
import { useCart } from "@/store/cart";
import { useSession } from "next-auth/react";
import { renderWithI18n } from "@/test/utils/renderWithI18n";

vi.mock("@/store/cart", () => ({
  useCart: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

const mockedUseCart = vi.mocked(useCart);
const mockedUseSession = vi.mocked(useSession);

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

const baseQuote = {
  ok: true as const,
  quote: {
    currency: "usd",
    delivery_option: null,
    subtotal_cents: 4000,
    discount_cents: 0,
    tax_rate: 0.07,
    shipping_cents: null,
    shipping_status: "pending" as const,
    shipping_display: "TBD",
    tax_cents: 280,
    total_cents: null,
    total_status: "pending" as const,
    total_display: "TBD",
    promo: null,
    items: [
      {
        product_id: "p-1",
        product_slug: "test-cap",
        name: "Test Cap",
        image_url: null,
        price_cents: 4000,
        quantity: 1,
        variant: null,
        size: null,
      },
    ],
  },
};

const shippingSelectedQuote = {
  ok: true as const,
  quote: {
    ...baseQuote.quote,
    delivery_option: "flat",
    shipping_cents: 600,
    shipping_status: "selected" as const,
    shipping_display: "$6.00",
    total_cents: 4880,
    total_status: "ready" as const,
    total_display: "$48.80",
  },
};

const promoQuote = {
  ok: true as const,
  quote: {
    ...shippingSelectedQuote.quote,
    discount_cents: 100,
    tax_cents: 273,
    total_cents: 4773,
    total_display: "$47.73",
    promo: {
      promo_code_id: "promo-1",
      normalized_code: "E2E10",
      stripe_coupon_id: "coupon_1",
    },
  },
};

beforeEach(() => {
  mockedUseSession.mockReturnValue({
    data: null,
    status: "unauthenticated",
    update: vi.fn(),
  } as unknown as ReturnType<typeof useSession>);

  mockedUseCart.mockReturnValue({
    items: {
      "test-cap::": {
        productId: "11111111-1111-1111-1111-111111111111",
        productSlug: "test-cap",
        name: "Test Cap",
        imageUrl: null,
        priceCents: 4000,
        variant: null,
        size: null,
        quantity: 1,
      },
    },
    addItem: vi.fn(),
    removeItem: vi.fn(),
    setQuantity: vi.fn(),
    clear: vi.fn(),
  });
});

describe("Checkout quote state machine", () => {
  it("shows pending shipping/total until user selects shipping", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
      const body = JSON.parse((init?.body as string) || "{}") as { shippingOption?: string | null };
      if (body.shippingOption === "flat") return jsonResponse(shippingSelectedQuote);
      return jsonResponse(baseQuote);
    });

    const { t } = renderWithI18n(<CheckoutPage />, { locale: "EN" });

    expect(screen.getByTestId("checkout-subtotal-value")).toHaveTextContent(t("common.loading"));
    expect(screen.getByTestId("checkout-shipping-value")).toHaveTextContent(t("common.loading"));
    expect(screen.getByTestId("checkout-total-value")).toHaveTextContent(t("common.loading"));

    await waitFor(() => {
      expect(screen.getByTestId("checkout-subtotal-value")).toHaveTextContent("$40.00");
      expect(screen.getByTestId("checkout-tax-value")).toHaveTextContent("$2.80");
      expect(screen.getByTestId("checkout-shipping-value")).toHaveTextContent("TBD");
      expect(screen.getByTestId("checkout-total-value")).toHaveTextContent("TBD");
      expect(screen.getByTestId("checkout-pay-button")).toBeDisabled();
      expect(screen.getByTestId("checkout-shipping-required")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId("shipping-option-flat"));
    await waitFor(() => {
      expect(screen.getByTestId("checkout-shipping-value")).toHaveTextContent("$6.00");
      expect(screen.getByTestId("checkout-total-value")).toHaveTextContent("$48.80");
    });
  });

  it("applies promo successfully and renders discount row with updated totals", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
      const body = JSON.parse((init?.body as string) || "{}") as {
        promoCode?: string | null;
        shippingOption?: string | null;
      };
      if (body.promoCode && body.shippingOption === "flat") return jsonResponse(promoQuote);
      if (body.shippingOption === "flat") return jsonResponse(shippingSelectedQuote);
      return jsonResponse(baseQuote);
    });

    renderWithI18n(<CheckoutPage />, { locale: "EN" });

    await userEvent.click(await screen.findByTestId("shipping-option-flat"));
    await waitFor(() => {
      expect(screen.getByTestId("checkout-total-value")).toHaveTextContent("$48.80");
    });

    await userEvent.type(screen.getByTestId("checkout-promo-input"), "E2E10");
    await userEvent.click(screen.getByTestId("checkout-promo-apply"));

    await waitFor(() => {
      expect(screen.getByTestId("checkout-discount-value")).toHaveTextContent("-$1.00");
      expect(screen.getByTestId("checkout-tax-value")).toHaveTextContent("$2.73");
      expect(screen.getByTestId("checkout-total-value")).toHaveTextContent("$47.73");
    });
  });

  it("shows promo error and keeps totals unchanged when promo fails", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
      const body = JSON.parse((init?.body as string) || "{}") as {
        promoCode?: string | null;
        shippingOption?: string | null;
      };
      if (body.promoCode && body.shippingOption === "flat") {
        return jsonResponse(
          { ok: false, error: "Invalid promo code", promoError: { reason: "not_found" } },
          200
        );
      }
      if (body.shippingOption === "flat") return jsonResponse(shippingSelectedQuote);
      return jsonResponse(baseQuote);
    });

    renderWithI18n(<CheckoutPage />, { locale: "EN" });

    await userEvent.click(await screen.findByTestId("shipping-option-flat"));
    await waitFor(() => {
      expect(screen.getByTestId("checkout-total-value")).toHaveTextContent("$48.80");
    });

    await userEvent.type(screen.getByTestId("checkout-promo-input"), "BADCODE");
    await userEvent.click(screen.getByTestId("checkout-promo-apply"));

    await waitFor(() => {
      expect(screen.getByTestId("checkout-promo-status")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("checkout-discount-value")).not.toBeInTheDocument();
    expect(screen.getByTestId("checkout-subtotal-value")).toHaveTextContent("$40.00");
    expect(screen.getByTestId("checkout-shipping-value")).toHaveTextContent("$6.00");
    expect(screen.getByTestId("checkout-tax-value")).toHaveTextContent("$2.80");
    expect(screen.getByTestId("checkout-total-value")).toHaveTextContent("$48.80");
  });

  it("supports retry flow after quote error and recovers totals", async () => {
    let shouldFailQuote = true;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      if (shouldFailQuote) {
        return jsonResponse({ ok: false, error: "quote failed" }, 500);
      }
      return jsonResponse(baseQuote);
    });

    renderWithI18n(<CheckoutPage />, { locale: "EN" });

    const errorBox = await screen.findByTestId("checkout-quote-error");
    expect(errorBox).toBeInTheDocument();
    expect(screen.getByTestId("checkout-quote-retry")).toBeInTheDocument();

    shouldFailQuote = false;
    fireEvent.click(screen.getByTestId("checkout-quote-retry"));

    await waitFor(() => {
      expect(screen.queryByTestId("checkout-quote-error")).not.toBeInTheDocument();
      expect(screen.getByTestId("checkout-total-value")).toHaveTextContent("TBD");
    });
  });
});
