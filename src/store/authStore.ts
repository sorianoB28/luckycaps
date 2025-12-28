"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type User = {
  firstName: string;
  lastName: string;
  email: string;
  marketingOptIn: boolean;
};

type SignUpInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  marketingOptIn?: boolean;
};

interface AuthState {
  isAuthed: boolean;
  user: User | null;
  signIn: (email: string) => void;
  signUp: (data: SignUpInput) => void;
  signOut: () => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthed: false,
      user: null,
      signIn: (email) => {
        const existing = get().user;
        set({
          isAuthed: true,
          user:
            existing ??
            ({
              firstName: "Lucky",
              lastName: "Guest",
              email,
              marketingOptIn: false,
            } satisfies User),
        });
      },
      signUp: ({ firstName, lastName, email, marketingOptIn }) =>
        set({
          isAuthed: true,
          user: {
            firstName,
            lastName,
            email,
            marketingOptIn: Boolean(marketingOptIn),
          },
        }),
      signOut: () => set({ isAuthed: false, user: null }),
      updateUser: (updates) =>
        set((state) =>
          state.user
            ? { user: { ...state.user, ...updates } }
            : { user: state.user }
        ),
    }),
    {
      name: "luckycaps-auth",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
