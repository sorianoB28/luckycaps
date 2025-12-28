"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "luckycaps";

interface AdminState {
  isAdmin: boolean;
  username: string | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      isAdmin: false,
      username: null,
      login: (username, password) => {
        const isValid =
          username.toLowerCase() === ADMIN_USERNAME &&
          password === ADMIN_PASSWORD;
        if (isValid) {
          set({ isAdmin: true, username });
        }
        return isValid;
      },
      logout: () => set({ isAdmin: false, username: null }),
    }),
    {
      name: "luckycaps-admin-auth",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
