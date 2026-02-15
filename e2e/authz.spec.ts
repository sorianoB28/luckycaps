import { expect, test, type Page } from "@playwright/test";

import { login } from "./helpers/auth";
import { loginAsAdmin } from "./helpers/admin";
import { gotoAndWait } from "./helpers/navigation";
import { e2eEmail, e2eSlug } from "./helpers/run";

test.use({ storageState: undefined });

async function expectSignInGate(page: Page, expectedReason?: RegExp) {
  const landedOnSignIn = await page
    .waitForURL((url) => url.pathname.startsWith("/auth/sign-in"), { timeout: 20_000 })
    .then(() => true)
    .catch(() => false);

  if (landedOnSignIn) {
    await expect(page.locator('form input[type="email"]').first()).toBeVisible({
      timeout: 20_000,
    });

    if (expectedReason) {
      await expect
        .poll(() => {
          const url = new URL(page.url());
          return url.searchParams.get("reason") ?? "";
        })
        .toMatch(expectedReason);
      const accessNotice = page.getByTestId("auth-access-notice");
      await expect(accessNotice).toBeVisible({ timeout: 20_000 });
      await expect(accessNotice).toHaveAttribute("data-reason", expectedReason);
    }
    return;
  }

  const blockedState = page.getByTestId("admin-access-blocked");
  await expect(blockedState).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("admin-access-signin-link")).toBeVisible({ timeout: 20_000 });
  if (expectedReason) {
    await expect(blockedState).toHaveAttribute("data-reason", expectedReason);
  }
}

async function createNonAdminUser(page: Page) {
  const stamp = Date.now();
  const email = e2eEmail(`authz-non-admin-${stamp}`);
  const password = `E2E!User${stamp}9`;

  const response = await page.request.post("/api/auth/signup", {
    data: {
      email,
      password,
      first_name: "E2E",
      last_name: "Customer",
      marketing_opt_in: false,
    },
  });

  const raw = await response.text();
  if (!response.ok()) {
    throw new Error(
      `Unable to create non-admin user for authz test. Status ${response.status()}. Response: ${raw}`
    );
  }

  return { email, password };
}

test("logged-out user visiting /account is redirected to sign-in", async ({ page }, testInfo) => {
  await gotoAndWait(page, "/account", {
    testInfo,
    timeout: 25_000,
    debugLabel: "authz-account-logged-out",
  });

  await expectSignInGate(page);
});

test("logged-out user visiting /admin is redirected to sign-in", async ({ page }, testInfo) => {
  await gotoAndWait(page, "/admin", {
    testInfo,
    timeout: 25_000,
    debugLabel: "authz-admin-logged-out",
  });

  await expectSignInGate(page, /auth_required/);
});

test("logged-in non-admin visiting admin products is blocked with access notice", async ({
  page,
}, testInfo) => {
  const user = await createNonAdminUser(page);
  await login(page, {
    signInPath: "/auth/sign-in",
    expectedPathname: "/",
    email: user.email,
    password: user.password,
  });

  const sessionRes = await page.request.get("/api/auth/session");
  expect(sessionRes.ok()).toBeTruthy();
  const sessionJson = (await sessionRes.json()) as { user?: { role?: string } };
  expect(sessionJson.user?.role).not.toBe("admin");

  await gotoAndWait(page, "/admin/products/new", {
    testInfo,
    timeout: 30_000,
    debugLabel: "authz-admin-products-non-admin",
  });

  await expectSignInGate(page, /admin_required/);
});

test("admin session expiry shows friendly message and blocks product creation", async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);

  const stamp = Date.now();
  const slug = `${e2eSlug("session-expired-product")}-${stamp}`;

  await loginAsAdmin(page);
  await gotoAndWait(page, "/admin/products/new", {
    testInfo,
    timeout: 30_000,
    debugLabel: "authz-admin-session-expiry",
  });

  await page.context().clearCookies();
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  await gotoAndWait(page, "/admin/products/new", {
    testInfo,
    timeout: 25_000,
    debugLabel: "authz-admin-session-expiry-reload",
  });
  await expectSignInGate(page, /session_expired|auth_required/);

  const createResponse = await page.request.post("/api/admin/products", {
    data: {
      name: `E2E Session Expired ${stamp}`,
      slug,
      category: "snapbacks",
      description: "This write should fail after session expiry.",
      price: 39.99,
      stock: 2,
      isSale: false,
      isNewDrop: false,
      images: [],
      sizes: [],
    },
  });
  expect([401, 403]).toContain(createResponse.status());

  const createdProductResponse = await page.request.get(`/api/products/${slug}`);
  expect(createdProductResponse.status()).toBe(404);
});
