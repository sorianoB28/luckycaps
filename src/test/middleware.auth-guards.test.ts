/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getTokenMock = vi.hoisted(() => vi.fn());

vi.mock("next-auth/jwt", () => ({
  getToken: getTokenMock,
}));

import { config, middleware } from "@/middleware";

function makeRequest(path: string) {
  return new NextRequest(`http://localhost:3000${path}`);
}

function getRedirectPathAndParams(response: Response) {
  const location = response.headers.get("location");
  expect(location).toBeTruthy();
  const url = new URL(location!);
  return {
    pathname: url.pathname,
    redirect: url.searchParams.get("redirect"),
    reason: url.searchParams.get("reason"),
  };
}

describe("middleware auth guard contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = "test-secret";
    delete process.env.AUTH_SECRET;
  });

  it("logged out visiting /account redirects to sign-in with reason and redirect", async () => {
    getTokenMock.mockResolvedValue(null);

    const response = await middleware(makeRequest("/account"));
    const parsed = getRedirectPathAndParams(response);

    expect(response.status).toBe(307);
    expect(parsed.pathname).toBe("/auth/sign-in");
    expect(parsed.redirect).toBe("/account");
    expect(parsed.reason).toBe("auth_required");
  });

  it("logged out visiting /admin/products redirects with redirect preserved", async () => {
    getTokenMock.mockResolvedValue(null);

    const response = await middleware(makeRequest("/admin/products?tab=drops"));
    const parsed = getRedirectPathAndParams(response);

    expect(response.status).toBe(307);
    expect(parsed.pathname).toBe("/auth/sign-in");
    expect(parsed.redirect).toBe("/admin/products?tab=drops");
    expect(parsed.reason).toBe("auth_required");
  });

  it("logged-in non-admin visiting /admin/products redirects with admin_required", async () => {
    getTokenMock.mockResolvedValue({
      sub: "user-1",
      email: "user@example.com",
      role: "user",
    });

    const response = await middleware(makeRequest("/admin/products"));
    const parsed = getRedirectPathAndParams(response);

    expect(response.status).toBe(307);
    expect(parsed.pathname).toBe("/auth/sign-in");
    expect(parsed.redirect).toBe("/admin/products");
    expect(parsed.reason).toBe("admin_required");
  });

  it("logged-in admin visiting /admin/products is allowed", async () => {
    getTokenMock.mockResolvedValue({
      sub: "admin-1",
      email: "admin@example.com",
      role: "admin",
    });

    const response = await middleware(makeRequest("/admin/products"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("middleware matcher includes admin and account routes", () => {
    expect(config.matcher).toEqual(expect.arrayContaining(["/admin/:path*", "/account/:path*"]));
  });
});
