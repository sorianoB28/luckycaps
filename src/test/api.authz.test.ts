/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { createJsonRequest, readJson } from "@/test/helpers/http";

const getServerSessionMock = vi.hoisted(() => vi.fn());
const adminSqlMock = vi.hoisted(() => vi.fn());

vi.mock("next-auth/next", () => ({
  getServerSession: getServerSessionMock,
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/adminDb", () => ({
  default: adminSqlMock,
  sql: adminSqlMock,
}));

import { GET as getAdminOrders } from "@/app/api/admin/orders/route";

describe("API contract: admin authz", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("rejects unauthenticated requests with 401", async () => {
    getServerSessionMock.mockResolvedValue(null);

    const response = await getAdminOrders(createJsonRequest("/api/admin/orders"));
    const payload = await readJson<{ error: string }>(response);

    expect(response.status).toBe(401);
    expect(payload.error).toBe("Unauthorized");
    expect(adminSqlMock).not.toHaveBeenCalled();
  });

  it("rejects authenticated non-admin requests with 403", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "user-1", email: "user@example.com", role: "user" },
    });

    const response = await getAdminOrders(createJsonRequest("/api/admin/orders"));
    const payload = await readJson<{ error: string }>(response);

    expect(response.status).toBe(403);
    expect(payload.error).toBe("Forbidden");
    expect(adminSqlMock).not.toHaveBeenCalled();
  });

  it("allows admin requests and returns orders payload", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", email: "admin@example.com", role: "admin" },
    });
    adminSqlMock.mockResolvedValue([
      {
        id: "order-1",
        created_at: "2026-01-01T00:00:00.000Z",
        status: "paid",
        email: "buyer@example.com",
        subtotal_cents: 4200,
        items_count: 1,
      },
    ]);

    const response = await getAdminOrders(createJsonRequest("/api/admin/orders"));
    const payload = await readJson<{ orders: Array<{ id: string }>; nextCursor: string | null }>(
      response
    );

    expect(response.status).toBe(200);
    expect(payload.orders).toHaveLength(1);
    expect(payload.orders[0]?.id).toBe("order-1");
    expect(payload.nextCursor).toBeNull();
    expect(adminSqlMock).toHaveBeenCalledTimes(1);
  });
});
