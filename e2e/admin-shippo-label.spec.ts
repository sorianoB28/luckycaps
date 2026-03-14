import { expect, test } from "@playwright/test";

import { loginAsAdmin } from "./helpers/admin";
import { gotoAndWait } from "./helpers/navigation";
import { getFirstShopProduct } from "./helpers/reviews";
import { e2eEmail } from "./helpers/run";
import { seedPaidOrderForShipping } from "./helpers/shipping";

test.use({ storageState: undefined });

test("admin buys shipping label for a paid order", async ({ page }, testInfo) => {
  test.setTimeout(120_000);

  const product = await getFirstShopProduct(page);
  const stamp = Date.now();
  const guestEmail = e2eEmail(`shippo-guest-${stamp}`);

  const seeded = await seedPaidOrderForShipping(page, {
    productId: product.id,
    email: guestEmail,
  });

  await loginAsAdmin(page);
  await gotoAndWait(page, `/admin/orders/${seeded.orderId}`, {
    testInfo,
    timeout: 35_000,
    debugLabel: "admin-order-shippo-buy",
  });

  await expect(page.getByTestId("admin-shipping-panel")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("admin-shipping-rates-list")).toBeVisible({ timeout: 20_000 });

  const buyButton = page.getByTestId("admin-shipping-buy-label").first();
  await expect(buyButton).toBeVisible({ timeout: 20_000 });
  await expect(buyButton).toBeEnabled({ timeout: 20_000 });

  const buyResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes(`/api/admin/orders/${seeded.orderId}/shipping/buy`)
  );

  await buyButton.click();

  const buyResponse = await buyResponsePromise;
  expect(buyResponse.ok()).toBeTruthy();

  const buyPayload = (await buyResponse.json()) as {
    shipment?: {
      status?: string;
      label_url?: string | null;
      tracking_number?: string | null;
      tracking_url?: string | null;
    };
  };

  expect(buyPayload.shipment?.label_url).toBeTruthy();
  expect(buyPayload.shipment?.tracking_number).toBeTruthy();
  expect(
    buyPayload.shipment?.status === "purchased" || buyPayload.shipment?.status === "shipped"
  ).toBeTruthy();

  await expect(page.getByTestId("admin-shipping-status").first()).toContainText(/purchased|shipped/i, {
    timeout: 20_000,
  });
  await expect(page.getByTestId("admin-shipping-label-ready")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("admin-shipping-tracking-number")).toBeVisible({
    timeout: 20_000,
  });

  const orderRes = await page.request.get(`/api/admin/orders/${seeded.orderId}`);
  expect(orderRes.ok()).toBeTruthy();
  const orderData = (await orderRes.json()) as {
    order?: {
      status?: string;
      shipping_confirmation_sent_at?: string | null;
      last_email_error?: string | null;
    };
    shipment?: {
      status?: string;
      label_url?: string | null;
      tracking_number?: string | null;
      tracking_url?: string | null;
    } | null;
  };

  expect(orderData.shipment?.label_url).toBeTruthy();
  expect(orderData.shipment?.tracking_number).toBeTruthy();
  expect(
    orderData.shipment?.status === "purchased" || orderData.order?.status === "shipped"
  ).toBeTruthy();
  expect(orderData.order?.shipping_confirmation_sent_at ?? null).toBeNull();
});
