"use client";

import { create } from "zustand";

type Language = "EN" | "ES";

interface UIState {
  language: Language;
  cartOpen: boolean;
  toggleLanguage: () => void;
  setCartOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  language: "EN",
  cartOpen: false,
  toggleLanguage: () =>
    set((state) => ({ language: state.language === "EN" ? "ES" : "EN" })),
  setCartOpen: (open) => set({ cartOpen: open }),
}));
