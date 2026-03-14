/** @vitest-environment node */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createJsonRequest } from "@/test/helpers/http";

const sqlMock = vi.hoisted(() => vi.fn(async () => []));
const buildEmailPreviewMock = vi.hoisted(() => vi.fn(async () => null));
const sendOrderConfirmationEmailMock = vi.hoisted(
  () =>
    vi.fn(async () => ({
      ok: true as const,
      skipped: true,
    }))
);
const sendShippingConfirmationEmailMock = vi.hoisted(
  () =>
    vi.fn(async () => ({
      ok: true as const,
      skipped: true,
    }))
);
const bcryptHashMock = vi.hoisted(() => vi.fn(async () => "hashed-password"));

vi.mock("@/lib/db", () => ({
  default: sqlMock,
  sql: sqlMock,
}));

vi.mock("@/lib/email/resend", () => ({
  buildEmailPreview: buildEmailPreviewMock,
  sendOrderConfirmationEmail: sendOrderConfirmationEmailMock,
  sendShippingConfirmationEmail: sendShippingConfirmationEmailMock,
  normalizeLocale: (value: string | null | undefined) =>
    value?.toLowerCase() === "es" ? "es" : "en",
}));

vi.mock("bcryptjs", () => ({
  default: { hash: bcryptHashMock },
  hash: bcryptHashMock,
}));

type RouteCase = {
  name: string;
  load: () => Promise<Record<string, (...args: unknown[]) => Promise<Response>>>;
  invoke: (mod: Record<string, (...args: unknown[]) => Promise<Response>>) => Promise<Response>;
};

const cases: RouteCase[] = [
  {
    name: "dev e2e ping GET",
    load: () => import("@/app/api/dev/e2e/ping/route"),
    invoke: (mod) => mod.GET(),
  },
  {
    name: "dev e2e reset POST",
    load: () => import("@/app/api/dev/e2e/reset/route"),
    invoke: (mod) => mod.POST(createJsonRequest("/api/dev/e2e/reset", { method: "POST", body: {} })),
  },
  {
    name: "dev email preview GET",
    load: () => import("@/app/api/dev/email-preview/route"),
    invoke: (mod) =>
      mod.GET(createJsonRequest("/api/dev/email-preview?type=order_confirmation&orderId=test")),
  },
  {
    name: "dev email send GET",
    load: () => import("@/app/api/dev/email-send/route"),
    invoke: (mod) =>
      mod.GET(createJsonRequest("/api/dev/email-send?type=order_confirmation&orderId=test")),
  },
  {
    name: "dev marketing subscriber GET",
    load: () => import("@/app/api/dev/marketing-subscriber/route"),
    invoke: (mod) => mod.GET(createJsonRequest("/api/dev/marketing-subscriber?email=test@example.com")),
  },
  {
    name: "dev marketing subscriber POST",
    load: () => import("@/app/api/dev/marketing-subscriber/route"),
    invoke: (mod) =>
      mod.POST(
        createJsonRequest("/api/dev/marketing-subscriber", {
          method: "POST",
          body: { email: "test@example.com" },
        })
      ),
  },
  {
    name: "dev marketing subscriber DELETE",
    load: () => import("@/app/api/dev/marketing-subscriber/route"),
    invoke: (mod) =>
      mod.DELETE(createJsonRequest("/api/dev/marketing-subscriber?email=test@example.com", { method: "DELETE" })),
  },
  {
    name: "dev seed admin POST",
    load: () => import("@/app/api/dev/seed-admin/route"),
    invoke: (mod) =>
      mod.POST(
        createJsonRequest("/api/dev/seed-admin", {
          method: "POST",
          body: { email: "admin@example.com", password: "password123" },
        })
      ),
  },
  {
    name: "dev seed checkout success session POST",
    load: () => import("@/app/api/dev/seed-checkout-success-session/route"),
    invoke: (mod) =>
      mod.POST(
        createJsonRequest("/api/dev/seed-checkout-success-session", {
          method: "POST",
          body: {},
        })
      ),
  },
  {
    name: "dev seed paid order for review POST",
    load: () => import("@/app/api/dev/seed-paid-order-for-review/route"),
    invoke: (mod) =>
      mod.POST(
        createJsonRequest("/api/dev/seed-paid-order-for-review", {
          method: "POST",
          body: { productId: "11111111-1111-1111-1111-111111111111", email: "buyer@example.com" },
        })
      ),
  },
  {
    name: "dev seed paid order for shipping POST",
    load: () => import("@/app/api/dev/seed-paid-order-for-shipping/route"),
    invoke: (mod) =>
      mod.POST(
        createJsonRequest("/api/dev/seed-paid-order-for-shipping", {
          method: "POST",
          body: { productId: "11111111-1111-1111-1111-111111111111", email: "buyer@example.com" },
        })
      ),
  },
  {
    name: "dev seed promo POST",
    load: () => import("@/app/api/dev/seed-promo/route"),
    invoke: (mod) =>
      mod.POST(
        createJsonRequest("/api/dev/seed-promo", {
          method: "POST",
          body: { code: "E2E_TEST", type: "amount", valueCents: 100 },
        })
      ),
  },
  {
    name: "dev subscribers count GET",
    load: () => import("@/app/api/dev/subscribers-count/route"),
    invoke: (mod) => mod.GET(),
  },
];

describe("API contract: /api/dev lockout in production", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeAll(() => {
    process.env.NODE_ENV = "production";
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it.each(cases)("$name returns 404 in production", async ({ load, invoke }) => {
    process.env.NODE_ENV = "production";
    const mod = await load();
    const response = await invoke(mod);

    expect(response.status).toBe(404);
  });
});
