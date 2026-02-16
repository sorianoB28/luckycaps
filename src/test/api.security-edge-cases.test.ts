/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { readJson } from "@/test/helpers/http";

const sqlMock = vi.hoisted(() => vi.fn(async () => []));
const getServerSessionMock = vi.hoisted(() => vi.fn(async () => null));
const validatePromoCodeMock = vi.hoisted(() =>
  vi.fn(async () => ({
    valid: false as const,
    reason: "not_found" as const,
  }))
);

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

vi.mock("@/lib/promo", () => ({
  validatePromoCode: validatePromoCodeMock,
}));

import * as promoValidateRoute from "@/app/api/promo/validate/route";
import * as reviewsRoute from "@/app/api/reviews/route";
import * as marketingSubscribeRoute from "@/app/api/marketing/subscribe/route";

describe("API contract: security edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unexpected methods with 405", async () => {
    const promoResp = await promoValidateRoute.PUT();
    const promoJson = await readJson<{ valid: boolean; error: string }>(promoResp);
    expect(promoResp.status).toBe(405);
    expect(promoJson.error).toBe("method_not_allowed");

    const reviewsResp = await reviewsRoute.DELETE();
    const reviewsJson = await readJson<{ error: string }>(reviewsResp);
    expect(reviewsResp.status).toBe(405);
    expect(reviewsJson.error).toMatch(/method not allowed/i);

    const marketingResp = await marketingSubscribeRoute.GET();
    const marketingJson = await readJson<{ ok: boolean; error: string }>(marketingResp);
    expect(marketingResp.status).toBe(405);
    expect(marketingJson.ok).toBe(false);
    expect(marketingJson.error).toMatch(/method not allowed/i);
  });

  it("rejects malformed JSON with 400", async () => {
    const malformedPromo = await promoValidateRoute.POST(
      new Request("http://localhost:3000/api/promo/validate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: '{"code":',
      })
    );
    const malformedPromoJson = await readJson<{ valid: boolean; error: string }>(malformedPromo);
    expect(malformedPromo.status).toBe(400);
    expect(malformedPromoJson.valid).toBe(false);
    expect(malformedPromoJson.error).toBe("invalid_json");

    const malformedReview = await reviewsRoute.POST(
      new Request("http://localhost:3000/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: '{"rating":',
      })
    );
    const malformedReviewJson = await readJson<{ error: string }>(malformedReview);
    expect(malformedReview.status).toBe(400);
    expect(malformedReviewJson.error).toMatch(/invalid json body/i);

    const malformedMarketing = await marketingSubscribeRoute.POST(
      new Request("http://localhost:3000/api/marketing/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: '{"email":',
      })
    );
    const malformedMarketingJson = await readJson<{ ok: boolean; error: string }>(malformedMarketing);
    expect(malformedMarketing.status).toBe(400);
    expect(malformedMarketingJson.ok).toBe(false);
    expect(malformedMarketingJson.error).toMatch(/invalid json body/i);
  });

  it("rejects missing required fields with 400 and stable error shape", async () => {
    const missingPromo = await promoValidateRoute.POST(
      new Request("http://localhost:3000/api/promo/validate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      })
    );
    const missingPromoJson = await readJson<{ valid: boolean; error: string; reason: string }>(
      missingPromo
    );
    expect(missingPromo.status).toBe(400);
    expect(missingPromoJson.valid).toBe(false);
    expect(missingPromoJson.error).toBe("code_required");
    expect(missingPromoJson.reason).toBe("missing_code");
    expect(validatePromoCodeMock).not.toHaveBeenCalled();

    const missingReview = await reviewsRoute.POST(
      new Request("http://localhost:3000/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      })
    );
    const missingReviewJson = await readJson<{ errors: Record<string, string> }>(missingReview);
    expect(missingReview.status).toBe(400);
    expect(missingReviewJson.errors).toBeTruthy();
    expect(missingReviewJson.errors.product_id).toMatch(/required/i);
    expect(missingReviewJson.errors.author_email).toMatch(/required/i);
    expect(sqlMock).not.toHaveBeenCalled();

    const missingMarketing = await marketingSubscribeRoute.POST(
      new Request("http://localhost:3000/api/marketing/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      })
    );
    const missingMarketingJson = await readJson<{ ok: boolean; error: string }>(missingMarketing);
    expect(missingMarketing.status).toBe(400);
    expect(missingMarketingJson.ok).toBe(false);
    expect(missingMarketingJson.error).toMatch(/valid email/i);
  });
});
