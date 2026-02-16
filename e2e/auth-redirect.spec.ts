import { expect, test } from "@playwright/test";

import { createRunScopedUser, login } from "./helpers/auth";

test.use({ storageState: undefined });

test("default login redirects to home", async ({ page }) => {
  const user = await createRunScopedUser(page, "auth-redirect-default");
  await login(page, {
    signInPath: "/auth/sign-in",
    expectedPathname: "/",
    email: user.email,
    password: user.password,
  });

  await expect(page).toHaveURL((url) => url.pathname === "/");
  await expect(page.locator("main h1").first()).toBeVisible();
});

test("redirect query param is respected", async ({ page }) => {
  const user = await createRunScopedUser(page, "auth-redirect-redirect-param");
  await login(page, {
    signInPath: "/auth/sign-in?redirect=/account",
    expectedPathname: "/account",
    email: user.email,
    password: user.password,
  });

  await expect(page).toHaveURL((url) => url.pathname.startsWith("/account"));
  await expect(page.locator('input[type="email"][readonly]').first()).toBeVisible();
});

test("callbackUrl query param is respected", async ({ page }) => {
  const user = await createRunScopedUser(page, "auth-redirect-callback-param");
  await login(page, {
    signInPath: "/auth/sign-in?callbackUrl=/account",
    expectedPathname: "/account",
    email: user.email,
    password: user.password,
  });

  await expect(page).toHaveURL((url) => url.pathname.startsWith("/account"));
  await expect(page.locator('input[type="email"][readonly]').first()).toBeVisible();
});
