import { expect, test } from "@playwright/test";

import {
  getMarketingSubscriber,
  seedOrClearSubscriber,
  submitMarketingSignup,
} from "./helpers/marketing";
import { gotoAndWait } from "./helpers/navigation";
import { e2eEmail } from "./helpers/run";

test.use({ storageState: undefined });
test.describe("marketing footer signup", () => {
  test.describe.configure({ mode: "serial", retries: 1 });

  test("stay in the loop signup inserts once and handles duplicates gracefully", async ({ page }) => {
    test.setTimeout(90_000);

    const stamp = Date.now();
    const email = e2eEmail(`marketing-${stamp}`);

    await seedOrClearSubscriber(page, email, "clear");
    await gotoAndWait(page, "/", { debugLabel: "marketing-signup" });

    const firstSubmit = await submitMarketingSignup(page, email);
    expect(firstSubmit.state).toBe("success");
    expect(firstSubmit.exists).toBeTruthy();
    expect(firstSubmit.count).toBe(1);
    expect(firstSubmit.message.length).toBeGreaterThan(4);

    const firstCheck = await getMarketingSubscriber(page, email);
    expect(firstCheck.exists).toBeTruthy();
    expect(firstCheck.count).toBe(1);
    expect(firstCheck.subscriber?.status).toBe("subscribed");

    const secondSubmit = await submitMarketingSignup(page, email);
    expect(secondSubmit.state).toBe("duplicate");
    expect(secondSubmit.exists).toBeTruthy();
    expect(secondSubmit.count).toBe(1);
    expect(secondSubmit.message.length).toBeGreaterThan(4);

    const secondCheck = await getMarketingSubscriber(page, email);
    expect(secondCheck.exists).toBeTruthy();
    expect(secondCheck.count).toBe(1);
    expect(secondCheck.subscriber?.status).toBe("subscribed");
  });
});
