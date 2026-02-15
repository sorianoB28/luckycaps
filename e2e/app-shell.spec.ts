import { expect, test } from "@playwright/test";

import { gotoAndWait } from "./helpers/navigation";

test("home page renders app shell", async ({ page }, testInfo) => {
  await gotoAndWait(page, "/", { testInfo, debugLabel: "home" });
  await expect(page.locator("main").first()).toBeVisible();
  await expect(page.locator('a[href="/shop"]').first()).toBeVisible();
});
