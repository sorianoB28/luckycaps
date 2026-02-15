import { expect, test } from "@playwright/test";

import {
  getMarketingSubscriber,
  seedOrClearSubscriber,
  submitMarketingSignup,
} from "./helpers/marketing";
import { gotoAndWait } from "./helpers/navigation";
import { e2eEmail } from "./helpers/run";

test.use({ storageState: undefined });

test.describe("guest marketing signup", () => {
  test.describe.configure({ mode: "serial", retries: 1 });

  test("works from checkout success page (or footer fallback) without account", async ({ page }) => {
    test.setTimeout(90_000);

    const stamp = Date.now();
    const email = e2eEmail(`guest-marketing-success-${stamp}`);

    await seedOrClearSubscriber(page, email, "clear");

    await gotoAndWait(page, "/checkout/success", {
      debugLabel: "guest-marketing-checkout-success",
      sectionSelector: "main, footer",
    });

    const marketingFormVisible = await page
      .getByTestId("marketing-signup-form")
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    if (!marketingFormVisible) {
      await gotoAndWait(page, "/", {
        debugLabel: "guest-marketing-home-fallback",
        sectionSelector: "main, footer",
      });
    }

    const submitResult = await submitMarketingSignup(page, email);
    expect(submitResult.state).toBe("success");
    expect(submitResult.exists).toBeTruthy();
    expect(submitResult.count).toBe(1);

    const subscriber = await getMarketingSubscriber(page, email);
    expect(subscriber.exists).toBeTruthy();
    expect(subscriber.count).toBe(1);
    expect(subscriber.subscriber?.status).toBe("subscribed");
    expect(subscriber.subscriber?.user_id ?? null).toBeNull();
  });
});

