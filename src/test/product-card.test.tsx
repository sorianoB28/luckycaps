import React from "react";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ProductCard from "@/components/products/ProductCard";
import { type Product } from "@/types";
import { renderWithI18n } from "@/test/utils/renderWithI18n";

const baseProduct: Product = {
  id: "p-1",
  slug: "test-cap",
  name: "Test Cap",
  price: 39.99,
  images: [],
  category: "Snapbacks",
  tags: [],
  description: "Signature cap for tests.",
  features: [],
  isNewDrop: false,
  isSale: false,
  variants: [],
  sizes: [],
  stock: 5,
};

describe("ProductCard", () => {
  it("renders name, price, and a fallback image when no product image exists", () => {
    renderWithI18n(<ProductCard product={baseProduct} />, { locale: "EN" });

    expect(screen.getByRole("heading", { name: "Test Cap" })).toBeInTheDocument();
    expect(screen.getByText("$39.99")).toBeInTheDocument();

    const image = screen.getByRole("img", { name: "Test Cap" }) as HTMLImageElement;
    expect(image).toBeInTheDocument();
    expect(image.src).toContain("unsplash.com");
  });
});
