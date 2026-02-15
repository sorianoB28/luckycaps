import { expect, test } from "@playwright/test";

import {
  seedCheckoutSuccessSession,
  visitCheckoutSuccess,
} from "./helpers/checkoutSuccess";

test.use({ storageState: undefined });

test("valid checkout success session redirects to order page", async ({ page }, testInfo) => {
  test.setTimeout(90_000);

  const seeded = await seedCheckoutSuccessSession(page);

  await visitCheckoutSuccess(page, seeded.sessionId, {
    testInfo,
    debugLabel: "checkout-success-valid-session",
  });

  await expect(page).toHaveURL(
    (url) => url.pathname === `/order/${seeded.orderId}` || url.pathname.startsWith(`/order/${seeded.orderId}`),
    { timeout: 30_000 }
  );
  await expect(page.getByTestId("order-page")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("order-page-title")).toContainText(seeded.orderId);
  await expect(page.getByTestId("order-contact-email")).toContainText(seeded.email);
});

test("invalid checkout success session shows fallback UI without crashing", async ({
  page,
}, testInfo) => {
  await visitCheckoutSuccess(page, "cs_test_INVALID", {
    testInfo,
    debugLabel: "checkout-success-invalid-session",
  });

  await expect(page).toHaveURL((url) => url.pathname === "/checkout/success", {
    timeout: 20_000,
  });
  await expect(page.getByTestId("checkout-success-shell")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("checkout-success-error")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("checkout-success-return-link")).toBeVisible({
    timeout: 20_000,
  });
});

