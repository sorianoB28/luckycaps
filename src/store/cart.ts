"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type CartItem = {
  productId?: string | null;
  productSlug: string;
  name: string;
  imageUrl?: string | null;
  priceCents: number;
  variant?: string | null;
  size?: string | null;
  quantity: number;
};

type CartState = {
  items: Record<string, CartItem>;
  addItem: (item: CartItem) => void;
  removeItem: (key: string) => void;
  setQuantity: (key: string, qty: number) => void;
  clear: () => void;
};

const buildKey = (item: Pick<CartItem, "productSlug" | "variant" | "size">) =>
  `${item.productSlug}:${item.variant ?? ""}:${item.size ?? ""}`;

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: {},
      addItem: (item) =>
        set((state) => {
          const key = buildKey(item);
          const existing = state.items[key];
          const nextQuantity = (existing?.quantity ?? 0) + item.quantity;
          return {
            items: {
              ...state.items,
              [key]: { ...item, quantity: nextQuantity },
            },
          };
        }),
      removeItem: (key) =>
        set((state) => {
          const next = { ...state.items };
          delete next[key];
          return { items: next };
        }),
      setQuantity: (key, qty) =>
        set((state) => {
          if (qty <= 0 || !state.items[key]) return state;
          return {
            items: {
              ...state.items,
              [key]: { ...state.items[key], quantity: qty },
            },
          };
        }),
      clear: () => set({ items: {} }),
    }),
    {
      name: "luckycaps-cart",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export { buildKey };
