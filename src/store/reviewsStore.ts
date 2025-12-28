"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { reviewsSeed } from "@/data/reviewsSeed";

export type Review = {
  id: string;
  productId: string;
  productSlug: string;
  rating: number;
  title: string;
  body: string;
  authorEmail: string;
  authorName?: string;
  variant?: string;
  size?: string;
  images?: string[];
  verifiedPurchase: boolean;
  helpfulCount: number;
  reported: boolean;
  createdAt: string;
};

const REQUIRE_VERIFIED_PURCHASE = false;
const SEED_VERSION = 1;

type ReviewsState = {
  reviews: Record<string, Review[]>;
  addReview: (review: Omit<Review, "id" | "helpfulCount" | "reported" | "verifiedPurchase" | "createdAt">) => Review;
  markHelpful: (productSlug: string, id: string) => void;
  unmarkHelpful: (productSlug: string, id: string) => void;
  reportReview: (productSlug: string, id: string) => void;
  resetToSeed: () => void;
  helpfulVotes: Record<string, Record<string, boolean>>; // reviewId -> { userKey: true }
  setHelpfulVote: (reviewId: string, userKey: string, voted: boolean) => void;
  hasUserVoted: (reviewId: string, userKey: string) => boolean;
};

const makeId = () => `rev-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;

const seedToMap = (seed: Review[]) =>
  seed.reduce<Record<string, Review[]>>((acc, review) => {
    acc[review.productSlug] = acc[review.productSlug] ?? [];
    acc[review.productSlug].push(review);
    return acc;
  }, {});

const seededMap = seedToMap(reviewsSeed);

export const useReviewsStore = create<ReviewsState>()(
  persist(
    (set, get) => ({
      reviews: seededMap,
      helpfulVotes: {},
      addReview: (review) => {
        const now = new Date().toISOString();
        const newReview: Review = {
          ...review,
          id: makeId(),
          createdAt: now,
          helpfulCount: 0,
          reported: false,
          verifiedPurchase: REQUIRE_VERIFIED_PURCHASE ? false : false,
        };
        const current = get().reviews[review.productSlug] ?? [];
        set({
          reviews: {
            ...get().reviews,
            [review.productSlug]: [newReview, ...current],
          },
        });
        return newReview;
      },
      markHelpful: (productSlug, id) => {
        const current = get().reviews[productSlug] ?? [];
        set({
          reviews: {
            ...get().reviews,
            [productSlug]: current.map((r) =>
              r.id === id ? { ...r, helpfulCount: r.helpfulCount + 1 } : r
            ),
          },
        });
      },
      unmarkHelpful: (productSlug, id) => {
        const current = get().reviews[productSlug] ?? [];
        set({
          reviews: {
            ...get().reviews,
            [productSlug]: current.map((r) =>
              r.id === id && r.helpfulCount > 0
                ? { ...r, helpfulCount: r.helpfulCount - 1 }
                : r
            ),
          },
        });
      },
      reportReview: (productSlug, id) => {
        const current = get().reviews[productSlug] ?? [];
        set({
          reviews: {
            ...get().reviews,
            [productSlug]: current.map((r) =>
              r.id === id ? { ...r, reported: true } : r
            ),
          },
        });
      },
      resetToSeed: () => set({ reviews: seededMap }),
      setHelpfulVote: (reviewId, userKey, voted) =>
        set((state) => ({
          helpfulVotes: {
            ...state.helpfulVotes,
            [reviewId]: {
              ...(state.helpfulVotes[reviewId] ?? {}),
              [userKey]: voted,
            },
          },
        })),
      hasUserVoted: (reviewId, userKey) =>
        Boolean(get().helpfulVotes[reviewId]?.[userKey]),
    }),
    {
      name: "luckycaps-reviews",
      storage: createJSONStorage(() => localStorage),
      version: SEED_VERSION + 1,
      migrate: (persisted, version) => {
        if (!persisted || version < SEED_VERSION + 1) {
          return { reviews: seededMap, helpfulVotes: {} };
        }
        return persisted as ReviewsState;
      },
    }
  )
);
