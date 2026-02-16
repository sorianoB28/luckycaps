import React from "react";
import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CartPage from "@/app/cart/page";
import { useCart } from "@/store/cart";
import { renderWithI18n } from "@/test/utils/renderWithI18n";

vi.mock("@/store/cart", () => ({
  useCart: vi.fn(),
}));

const mockedUseCart = vi.mocked(useCart);

beforeEach(() => {
  mockedUseCart.mockReturnValue({
    items: {
      "test-cap:standard:onesize": {
        productSlug: "test-cap",
        name: "Test Cap",
        imageUrl: null,
        priceCents: 3999,
        variant: "Standard",
        size: "One size",
        quantity: 1,
      },
    },
    addItem: vi.fn(),
    removeItem: vi.fn(),
    setQuantity: vi.fn(),
    clear: vi.fn(),
  });
});

describe("Cart summary i18n labels", () => {
  it("renders subtotal/shipping/tax labels in EN", () => {
    const { t } = renderWithI18n(<CartPage />, { locale: "EN" });

    expect(screen.getByRole("heading", { name: t("cart.orderSummary") })).toBeInTheDocument();
    expect(screen.getByText(t("common.subtotal"))).toBeInTheDocument();
    expect(screen.getByText(t("cart.shipping"))).toBeInTheDocument();
    expect(screen.getByText(t("cart.tax"))).toBeInTheDocument();
  });

  it("renders subtotal/shipping/tax labels in ES", async () => {
    const { t } = renderWithI18n(<CartPage />, { locale: "ES" });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: t("cart.orderSummary") })).toBeInTheDocument();
    });
    expect(screen.getByText(t("common.subtotal"))).toBeInTheDocument();
    expect(screen.getByText(t("cart.shipping"))).toBeInTheDocument();
    expect(screen.getByText(t("cart.tax"))).toBeInTheDocument();
  });
});
