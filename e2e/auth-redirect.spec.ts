import { expect, test } from "@playwright/test";

import { login } from "./helpers/auth";

test.use({ storageState: undefined });

test("default login redirects to home", async ({ page }) => {
  await login(page, { signInPath: "/auth/sign-in", expectedPathname: "/" });

  await expect(page).toHaveURL((url) => url.pathname === "/");
  await expect(page.locator("main h1").first()).toBeVisible();
});

test("redirect query param is respected", async ({ page }) => {
  await login(page, {
    signInPath: "/auth/sign-in?redirect=/account",
    expectedPathname: "/account",
  });

  await expect(page).toHaveURL((url) => url.pathname.startsWith("/account"));
  await expect(page.locator('input[type="email"][readonly]').first()).toBeVisible();
});

test("callbackUrl query param is respected", async ({ page }) => {
  await login(page, {
    signInPath: "/auth/sign-in?callbackUrl=/account",
    expectedPathname: "/account",
  });

  await expect(page).toHaveURL((url) => url.pathname.startsWith("/account"));
  await expect(page.locator('input[type="email"][readonly]').first()).toBeVisible();
});
