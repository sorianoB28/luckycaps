"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { CartItem, Product } from "@/types";

interface CartState {
  items: CartItem[];
  addItem: (product: Product, options: { variant: string; size: string }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clear: () => void;
  subtotal: () => number;
}

const buildCartId = (product: Product, variant: string, size: string) =>
  `${product.id}-${variant}-${size}`;

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, options) => {
        const cartId = buildCartId(product, options.variant, options.size);
        const existing = get().items.find((item) => item.id === cartId);
        if (existing) {
          set({
            items: get().items.map((item) =>
              item.id === cartId
                ? { ...item, quantity: item.quantity + 1 }
                : item
            ),
          });
          return;
        }
        set({
          items: [
            ...get().items,
            {
              id: cartId,
              slug: product.slug,
              name: product.name,
              price: product.price,
              image: product.images[0],
              variant: options.variant,
              size: options.size,
              quantity: 1,
            },
          ],
        });
      },
      removeItem: (id) =>
        set({
          items: get().items.filter((item) => item.id !== id),
        }),
      updateQuantity: (id, quantity) =>
        set({
          items: get().items.map((item) =>
            item.id === id ? { ...item, quantity } : item
          ),
        }),
      clear: () => set({ items: [] }),
      subtotal: () =>
        get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    }),
    {
      name: "luckycaps-cart",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
