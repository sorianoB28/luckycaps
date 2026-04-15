/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

function setBaseStripeEnv() {
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_test_value");
  vi.stubEnv("SITE_URL", "https://luckycaps.com");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", undefined);
  vi.stubEnv("URL", undefined);
  vi.stubEnv("DEPLOY_PRIME_URL", undefined);
  vi.stubEnv("NETLIFY_DEV", undefined);
  vi.stubEnv("CONTEXT", "production");
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("STRIPE_SUCCESS_URL", undefined);
  vi.stubEnv("STRIPE_CANCEL_URL", undefined);
}

async function loadStripeConfig() {
  vi.resetModules();
  return import("../lib/stripeConfig");
}

describe("stripe checkout URL resolution", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    setBaseStripeEnv();
  });

  it("uses generated app URLs in production even when deprecated URLs mismatch", async () => {
    vi.stubEnv(
      "STRIPE_SUCCESS_URL",
      "https://legacy.example.com/checkout/success?session_id={CHECKOUT_SESSION_ID}"
    );
    vi.stubEnv("STRIPE_CANCEL_URL", "https://legacy.example.com/checkout");

    const { resolveStripeCheckoutUrls } = await loadStripeConfig();
    const urls = resolveStripeCheckoutUrls("https://request-origin.example/api/checkout");

    expect(urls.appOrigin).toBe("https://luckycaps.com");
    expect(urls.successUrl).toBe(
      "https://luckycaps.com/checkout/success?session_id={CHECKOUT_SESSION_ID}"
    );
    expect(urls.cancelUrl).toBe("https://luckycaps.com/checkout?canceled=1");
  });

  it("keeps rejecting unsafe deprecated live URLs in production", async () => {
    vi.stubEnv(
      "STRIPE_SUCCESS_URL",
      "http://localhost:3000/checkout/success?session_id={CHECKOUT_SESSION_ID}"
    );

    const { resolveStripeCheckoutUrls } = await loadStripeConfig();

    expect(() => resolveStripeCheckoutUrls("https://request-origin.example/api/checkout")).toThrow(
      "Stripe live mode requires an https SITE_URL/URL/NEXT_PUBLIC_SITE_URL origin."
    );
  });

  it("warns in non-live mode and still falls back to generated URLs", async () => {
    vi.stubEnv("CONTEXT", "dev");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_test_value");
    vi.stubEnv("SITE_URL", "http://localhost:3000");
    vi.stubEnv("STRIPE_SUCCESS_URL", "https://legacy.example.com/checkout/success");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { resolveStripeCheckoutUrls } = await loadStripeConfig();
    const urls = resolveStripeCheckoutUrls("http://localhost:3000/api/checkout");

    expect(urls.successUrl).toBe(
      "http://localhost:3000/checkout/success?session_id={CHECKOUT_SESSION_ID}"
    );
    expect(urls.cancelUrl).toBe("http://localhost:3000/checkout?canceled=1");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("STRIPE_SUCCESS_URL must include {CHECKOUT_SESSION_ID} when set.")
    );
  });
});
