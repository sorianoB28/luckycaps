/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { createJsonRequest, readJson } from "@/test/helpers/http";
import { sqlTextFromArgs } from "@/test/helpers/sql";

const sqlMock = vi.hoisted(() => vi.fn());
const getServerSessionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  default: sqlMock,
  sql: sqlMock,
}));

vi.mock("next-auth/next", () => ({
  getServerSession: getServerSessionMock,
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

import { POST as createReview } from "@/app/api/reviews/route";

const PRODUCT_ID = "11111111-1111-1111-1111-111111111111";
const PRODUCT_SLUG = "test-cap";

type ReviewResponse = {
  reviewId?: string;
  error?: string;
  errors?: Record<string, string>;
};

function buildReviewRequest(authorEmail: string) {
  return createJsonRequest("/api/reviews", {
    method: "POST",
    body: {
      product_id: PRODUCT_ID,
      product_slug: PRODUCT_SLUG,
      rating: 5,
      title: "Great cap",
      body: "Looks great and fits perfectly.",
      author_email: authorEmail,
      author_name: "E2E Buyer",
      images: [],
    },
  });
}

describe("API contract: reviews eligibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSessionMock.mockResolvedValue(null);
  });

  it("blocks non-purchasers with 403 only_purchasers", async () => {
    sqlMock.mockImplementation(async (...args: unknown[]) => {
      const text = sqlTextFromArgs(args);
      if (text.includes("FROM public.products")) {
        return [{ id: PRODUCT_ID }];
      }
      if (text.includes("FROM public.orders o")) {
        return [];
      }
      if (text.includes("INSERT INTO public.reviews")) {
        throw new Error("Insert must not execute for non-purchaser");
      }
      throw new Error(`Unexpected SQL in non-purchaser test: ${text}`);
    });

    const response = await createReview(buildReviewRequest("nonbuyer@example.com"));
    const payload = await readJson<ReviewResponse>(response);

    expect(response.status).toBe(403);
    expect(payload.error).toBe("only_purchasers");
  });

  it("allows purchasers and returns created review id", async () => {
    sqlMock.mockImplementation(async (...args: unknown[]) => {
      const text = sqlTextFromArgs(args);
      if (text.includes("FROM public.products")) {
        return [{ id: PRODUCT_ID }];
      }
      if (text.includes("FROM public.orders o")) {
        return [{ exists: 1 }];
      }
      if (text.includes("INSERT INTO public.reviews")) {
        return [{ id: "review-1" }];
      }
      throw new Error(`Unexpected SQL in purchaser test: ${text}`);
    });

    const response = await createReview(buildReviewRequest("buyer@example.com"));
    const payload = await readJson<ReviewResponse>(response);

    expect(response.status).toBe(201);
    expect(payload.reviewId).toBe("review-1");
  });
});
