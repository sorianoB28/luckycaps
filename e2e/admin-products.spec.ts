import { expect, test } from "@playwright/test";

import { gotoAndWait } from "./helpers/navigation";
import { goToAdminProducts, loginAsAdmin } from "./helpers/admin";
import { RUN_ID, e2eSlug } from "./helpers/run";

test.use({ storageState: undefined });

test("admin can create and edit product", async ({ page }, testInfo) => {
  test.setTimeout(120_000);

  const stamp = Date.now();
  const slug = `${e2eSlug("product")}-${stamp}`;
  const initialName = `E2E Product ${RUN_ID} ${stamp}`;
  const updatedName = `${initialName} Updated`;
  const initialPrice = "39.99";
  const updatedPrice = "44.99";

  await loginAsAdmin(page);
  await goToAdminProducts(page);

  await gotoAndWait(page, "/admin/products/new", {
    testInfo,
    timeout: 30_000,
    debugLabel: "admin-product-new",
  });

  await page.locator("#name").fill(initialName);
  await page.locator("#slug").fill(slug);
  await page.locator("#description").fill("E2E admin create/edit product test description.");
  await page.locator("#category").fill("snapbacks");
  await page.locator("#stock").fill("5");
  await page.locator("#price").fill(initialPrice);

  const createSubmit = page.locator('form button[type="submit"]').first();
  await expect(createSubmit).toBeEnabled({ timeout: 20_000 });
  await createSubmit.click();

  await expect(page).toHaveURL((url) => url.pathname === "/admin", {
    timeout: 60_000,
  });

  const createdRow = page.locator("tr", { hasText: slug }).first();
  await expect(createdRow).toBeVisible({ timeout: 30_000 });
  await expect(createdRow).toContainText(initialName);

  const editLink = createdRow.locator('a[href^="/admin/products/"]').first();
  await expect(editLink).toBeVisible({ timeout: 20_000 });
  await editLink.click();

  await expect(page).toHaveURL(/\/admin\/products\//, { timeout: 30_000 });
  await expect(page.locator("#name")).toBeVisible({ timeout: 20_000 });

  await page.locator("#name").fill(updatedName);
  await page.locator("#price").fill(updatedPrice);

  const saveSubmit = page.locator('form button[type="submit"]').first();
  await expect(saveSubmit).toBeEnabled({ timeout: 20_000 });
  await saveSubmit.click();

  await expect(page).toHaveURL((url) => url.pathname === "/admin", {
    timeout: 90_000,
  });

  const updatedRow = page.locator("tr", { hasText: slug }).first();
  await expect(updatedRow).toBeVisible({ timeout: 30_000 });
  await expect(updatedRow).toContainText(updatedName);
  await expect(updatedRow).toContainText("$44.99");

  await gotoAndWait(page, `/product/${slug}`, {
    testInfo,
    timeout: 30_000,
    debugLabel: "storefront-updated-product",
  });

  await expect(page.locator("main h1").first()).toContainText(updatedName, {
    timeout: 30_000,
  });
});
