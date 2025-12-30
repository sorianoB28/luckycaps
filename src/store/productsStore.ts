"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { products as seedProducts } from "@/data/products";
import { getPlaceholderImages } from "@/lib/placeholderImages";
import { slugify } from "@/lib/slugify";
import { Product } from "@/types";

type ProductInput = Partial<Product> & {
  name: string;
};

interface ProductStoreState {
  products: Product[];
  addProduct: (product: ProductInput) => Product;
  updateProduct: (id: string, updates: Partial<ProductInput>) => Product | null;
  deleteProduct: (id: string) => void;
  duplicateProduct: (id: string) => Product | null;
  getProductById: (id: string) => Product | undefined;
}

const makeId = () =>
  `prod-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;

const ensureUniqueSlug = (base: string, list: Product[], skipId?: string) => {
  const normalizedBase = slugify(base || "product");
  let candidate = normalizedBase;
  let counter = 1;
  while (list.some((item) => item.slug === candidate && item.id !== skipId)) {
    candidate = `${normalizedBase}-${counter}`;
    counter += 1;
  }
  return candidate;
};

const normalizeProduct = (
  data: ProductInput,
  existing: Product[],
  current?: Product
): Product => {
  const merged = { ...current, ...data };
  const isSale = merged.isSale ?? false;
  const salePrice =
    merged.salePrice ??
    (isSale ? merged.price ?? current?.price : undefined);
  const price = salePrice ?? merged.price ?? current?.price ?? 0;
  const slugSource =
    merged.slug && merged.slug.trim().length > 0 ? merged.slug : merged.name;

  return {
    id: merged.id ?? makeId(),
    slug: ensureUniqueSlug(slugSource, existing, merged.id ?? current?.id),
    name: merged.name,
    category: merged.category ?? current?.category ?? "General",
    description: merged.description ?? current?.description ?? "",
    price,
    salePrice,
    originalPrice: isSale
      ? merged.originalPrice ?? current?.originalPrice ?? price
      : merged.originalPrice ?? current?.originalPrice,
    images:
      merged.images && merged.images.length > 0
        ? merged.images
        : getPlaceholderImages(
            merged.category ?? current?.category ?? "General",
            merged.slug ?? merged.name ?? "product",
            3
          ),
    tags: merged.tags ?? current?.tags ?? [],
    features: merged.features ?? current?.features ?? [],
    isNewDrop: merged.isNewDrop ?? current?.isNewDrop ?? false,
    isSale,
    variants: merged.variants ?? current?.variants ?? [],
    sizes: merged.sizes ?? current?.sizes ?? [],
    stock: merged.stock ?? current?.stock ?? 0,
  };
};

export const useProductsStore = create<ProductStoreState>()(
  persist(
    (set, get) => ({
      products: seedProducts,
      addProduct: (product) => {
        const normalized = normalizeProduct(product, get().products);
        set({ products: [...get().products, normalized] });
        return normalized;
      },
      updateProduct: (id, updates) => {
        const existing = get().products.find((p) => p.id === id);
        if (!existing) return null;
        const updated = normalizeProduct(
          { ...existing, ...updates, id },
          get().products,
          existing
        );
        set({
          products: get().products.map((p) => (p.id === id ? updated : p)),
        });
        return updated;
      },
      deleteProduct: (id) =>
        set({
          products: get().products.filter((p) => p.id !== id),
        }),
      duplicateProduct: (id) => {
        const existing = get().products.find((p) => p.id === id);
        if (!existing) return null;
        const copy = normalizeProduct(
          {
            ...existing,
            id: undefined,
            slug: `${existing.slug}-copy`,
            name: `${existing.name} Copy`,
          },
          get().products
        );
        set({ products: [...get().products, copy] });
        return copy;
      },
      getProductById: (id) => get().products.find((p) => p.id === id),
    }),
    {
      name: "luckycaps-products",
      storage: createJSONStorage(() => localStorage),
      version: 3,
      migrate: (persisted, version) => {
        if (!persisted || version < 3) {
          return {
            products: seedProducts,
          };
        }
        return persisted as ProductStoreState;
      },
    }
  )
);
