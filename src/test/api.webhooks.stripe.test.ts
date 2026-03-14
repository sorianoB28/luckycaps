/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { readJson } from "@/test/helpers/http";

const constructEventMock = vi.hoisted(() => vi.fn());
const attachStripeSessionToCheckoutMock = vi.hoisted(() => vi.fn());
const finalizeCheckoutByStripeSessionMock = vi.hoisted(() => vi.fn());
const hasStripeWebhookEventBeenProcessedMock = vi.hoisted(() => vi.fn());
const markStripeWebhookEventProcessedMock = vi.hoisted(() => vi.fn());
const recordCheckoutTotalMismatchMock = vi.hoisted(() => vi.fn());

vi.mock("stripe", () => {
  class StripeMock {
    webhooks = {
      constructEvent: constructEventMock,
    };
  }
  return { default: StripeMock };
});

vi.mock("@/lib/checkoutSessions", () => ({
  attachStripeSessionToCheckout: attachStripeSessionToCheckoutMock,
  finalizeCheckoutByStripeSession: finalizeCheckoutByStripeSessionMock,
  hasStripeWebhookEventBeenProcessed: hasStripeWebhookEventBeenProcessedMock,
  markStripeWebhookEventProcessed: markStripeWebhookEventProcessedMock,
  recordCheckoutTotalMismatch: recordCheckoutTotalMismatchMock,
}));

async function loadRoute() {
  vi.resetModules();
  return import("@/app/api/webhooks/stripe/route");
}

function makeWebhookRequest(body: string, signature = "t=1,v1=testsig") {
  return new Request("http://localhost:3000/api/webhooks/stripe", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": signature,
    },
    body,
  });
}

describe("API contract: Stripe webhooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    process.env.NODE_ENV = "test";
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_123";
    hasStripeWebhookEventBeenProcessedMock.mockResolvedValue(false);
    markStripeWebhookEventProcessedMock.mockResolvedValue(undefined);
    recordCheckoutTotalMismatchMock.mockResolvedValue({ ok: true, mismatch: false });
  });

  it("rejects invalid signature and applies no side effects", async () => {
    constructEventMock.mockImplementation(() => {
      throw new Error("invalid signature");
    });

    const { POST } = await loadRoute();
    const response = await POST(makeWebhookRequest('{"id":"evt_bad"}'));
    const payload = await readJson<{ error: string }>(response);

    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/invalid signature/i);
    expect(attachStripeSessionToCheckoutMock).not.toHaveBeenCalled();
    expect(finalizeCheckoutByStripeSessionMock).not.toHaveBeenCalled();
    expect(hasStripeWebhookEventBeenProcessedMock).not.toHaveBeenCalled();
    expect(markStripeWebhookEventProcessedMock).not.toHaveBeenCalled();
    expect(recordCheckoutTotalMismatchMock).not.toHaveBeenCalled();
  });

  it("skips unrelated event types and returns 200", async () => {
    constructEventMock.mockReturnValue({
      id: "evt_account_updated_1",
      type: "account.updated",
      data: { object: { id: "acct_1" } },
    });

    const { POST } = await loadRoute();
    const response = await POST(makeWebhookRequest('{"id":"evt_account_updated_1"}'));
    const payload = await readJson<{ received: boolean; skipped?: boolean }>(response);

    expect(response.status).toBe(200);
    expect(payload.received).toBe(true);
    expect(payload.skipped).toBe(true);
    expect(finalizeCheckoutByStripeSessionMock).not.toHaveBeenCalled();
    expect(hasStripeWebhookEventBeenProcessedMock).not.toHaveBeenCalled();
    expect(markStripeWebhookEventProcessedMock).not.toHaveBeenCalled();
    expect(recordCheckoutTotalMismatchMock).not.toHaveBeenCalled();
  });

  it("accepts valid signature and handles completed checkout event", async () => {
    constructEventMock.mockReturnValue({
      id: "evt_valid_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_1",
          metadata: { checkout_id: "checkout-1" },
          payment_intent: "pi_test_1",
          amount_total: 4600,
          currency: "usd",
        },
      },
    });
    attachStripeSessionToCheckoutMock.mockResolvedValue(undefined);
    finalizeCheckoutByStripeSessionMock.mockResolvedValue({
      orderId: "order-1",
      emailAttempted: false,
      emailResult: null,
    });
    recordCheckoutTotalMismatchMock.mockResolvedValue({
      ok: true,
      mismatch: false,
    });

    const { POST } = await loadRoute();
    const response = await POST(makeWebhookRequest('{"id":"evt_valid_1"}'));
    const payload = await readJson<{ received: boolean }>(response);

    expect(response.status).toBe(200);
    expect(payload.received).toBe(true);
    expect(hasStripeWebhookEventBeenProcessedMock).toHaveBeenCalledTimes(1);
    expect(attachStripeSessionToCheckoutMock).toHaveBeenCalledTimes(1);
    expect(finalizeCheckoutByStripeSessionMock).toHaveBeenCalledTimes(1);
    expect(markStripeWebhookEventProcessedMock).toHaveBeenCalledTimes(1);
    expect(recordCheckoutTotalMismatchMock).toHaveBeenCalledTimes(1);
  });

  it("handles duplicate replay without finalizing twice", async () => {
    const eventId = "evt_replay_1";
    constructEventMock.mockReturnValue({
      id: eventId,
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_replay_1",
          metadata: { checkout_id: "checkout-replay" },
          payment_intent: "pi_replay_1",
          amount_total: 4600,
          currency: "usd",
        },
      },
    });

    let seen = false;
    hasStripeWebhookEventBeenProcessedMock.mockImplementation(async () => seen);
    markStripeWebhookEventProcessedMock.mockImplementation(async () => {
      seen = true;
    });
    finalizeCheckoutByStripeSessionMock.mockResolvedValue({
      orderId: "order-replay",
      emailAttempted: false,
      emailResult: null,
    });

    const { POST } = await loadRoute();
    const first = await POST(makeWebhookRequest('{"id":"evt_replay_1"}'));
    const second = await POST(makeWebhookRequest('{"id":"evt_replay_1"}'));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(hasStripeWebhookEventBeenProcessedMock).toHaveBeenCalledTimes(2);
    expect(finalizeCheckoutByStripeSessionMock).toHaveBeenCalledTimes(1);
    expect(markStripeWebhookEventProcessedMock).toHaveBeenCalledTimes(1);
  });
});
