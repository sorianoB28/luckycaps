/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { readJson } from "@/test/helpers/http";
import { sqlTextFromArgs } from "@/test/helpers/sql";

const sqlMock = vi.hoisted(() => vi.fn());
const stripeRetrieveMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  default: sqlMock,
  sql: sqlMock,
}));

vi.mock("stripe", () => {
  class StripeMock {
    checkout = {
      sessions: {
        retrieve: stripeRetrieveMock,
      },
    };
  }

  return { default: StripeMock };
});

async function loadRoute() {
  vi.resetModules();
  return import("@/app/api/checkout/complete/route");
}

function makeRequest(sessionId: string) {
  return new Request(
    `http://localhost:3000/api/checkout/complete?session_id=${encodeURIComponent(sessionId)}`
  );
}

describe("API contract: checkout complete idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = "test";
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
  });

  it("returns the same orderId for repeated completion calls and never creates duplicate orders", async () => {
    const sessionId = "cs_test_repeat_123";

    stripeRetrieveMock.mockResolvedValue({
      id: sessionId,
      payment_status: "paid",
    });

    sqlMock.mockResolvedValue([{ id: "order-123" }]);

    const { GET } = await loadRoute();

    const first = await GET(makeRequest(sessionId));
    const second = await GET(makeRequest(sessionId));

    const firstPayload = await readJson<{ orderId: string }>(first);
    const secondPayload = await readJson<{ orderId: string }>(second);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(firstPayload.orderId).toBe("order-123");
    expect(secondPayload.orderId).toBe("order-123");

    expect(stripeRetrieveMock).toHaveBeenCalledTimes(2);
    expect(sqlMock).toHaveBeenCalledTimes(2);

    const sqlTexts = sqlMock.mock.calls.map((call) => sqlTextFromArgs(call));
    expect(
      sqlTexts.every(
        (text) =>
          text.includes("SELECT id") &&
          text.includes("FROM public.orders") &&
          text.includes("stripe_checkout_session_id")
      )
    ).toBe(true);
    expect(sqlTexts.some((text) => /insert\s+into\s+public\.orders/i.test(text))).toBe(false);
  });
});
