"use client";

import { create } from "zustand";

export type Language = "EN" | "ES";

interface UIState {
  language: Language;
  cartOpen: boolean;
  toggleLanguage: () => void;
  setLanguage: (language: Language) => void;
  setCartOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  language: "EN",
  cartOpen: false,
  toggleLanguage: () =>
    set((state) => ({ language: state.language === "EN" ? "ES" : "EN" })),
  setLanguage: (language) => set({ language }),
  setCartOpen: (open) => set({ cartOpen: open }),
}));
