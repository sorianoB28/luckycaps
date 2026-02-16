/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { createJsonRequest, readJson } from "@/test/helpers/http";
import { sqlTextFromArgs, sqlValuesFromArgs } from "@/test/helpers/sql";

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

import { POST as subscribePost } from "@/app/api/marketing/subscribe/route";

type SubscribeResponse = {
  ok: boolean;
  alreadySubscribed?: boolean;
  error?: string;
};

describe("API contract: marketing subscribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSessionMock.mockResolvedValue(null);
  });

  it("is idempotent: first call subscribes, second reports already subscribed", async () => {
    const subscribers = new Map<string, { status: string; userId: string | null }>();
    const userByEmail = new Map<string, string>();

    sqlMock.mockImplementation(async (...args: unknown[]) => {
      const text = sqlTextFromArgs(args);
      const values = sqlValuesFromArgs(args);

      if (text.includes("FROM public.marketing_subscribers") && text.includes("SELECT status")) {
        const email = String(values[0] ?? "").toLowerCase();
        const existing = subscribers.get(email);
        return existing ? [{ status: existing.status }] : [];
      }

      if (text.includes("SELECT id FROM public.users")) {
        const email = String(values[0] ?? "").toLowerCase();
        const userId = userByEmail.get(email);
        return userId ? [{ id: userId }] : [];
      }

      if (text.includes("INSERT INTO public.marketing_subscribers")) {
        const email = String(values[0] ?? "").toLowerCase();
        const userId = (values[3] as string | null | undefined) ?? null;
        const previous = subscribers.get(email);
        subscribers.set(email, {
          status: "subscribed",
          userId: userId ?? previous?.userId ?? null,
        });
        return [];
      }

      if (text.includes("UPDATE public.users")) {
        return [];
      }

      throw new Error(`Unexpected SQL in marketing subscribe test: ${text}`);
    });

    const first = await subscribePost(
      createJsonRequest("/api/marketing/subscribe", {
        method: "POST",
        body: {
          email: "  TEST@Example.COM ",
          locale: "EN",
          source: "footer_form",
        },
      })
    );
    const firstPayload = await readJson<SubscribeResponse>(first);

    const second = await subscribePost(
      createJsonRequest("/api/marketing/subscribe", {
        method: "POST",
        body: {
          email: "test@example.com",
          locale: "en",
          source: "footer_form",
        },
      })
    );
    const secondPayload = await readJson<SubscribeResponse>(second);

    expect(first.status).toBe(200);
    expect(firstPayload.ok).toBe(true);
    expect(firstPayload.alreadySubscribed).toBe(false);

    expect(second.status).toBe(200);
    expect(secondPayload.ok).toBe(true);
    expect(secondPayload.alreadySubscribed).toBe(true);

    expect(subscribers.size).toBe(1);
    expect(subscribers.has("test@example.com")).toBe(true);
  });

  it("rejects invalid email with 400", async () => {
    const response = await subscribePost(
      createJsonRequest("/api/marketing/subscribe", {
        method: "POST",
        body: { email: "not-an-email" },
      })
    );
    const payload = await readJson<SubscribeResponse>(response);

    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.error).toMatch(/valid email/i);
    expect(sqlMock).not.toHaveBeenCalled();
  });
});
