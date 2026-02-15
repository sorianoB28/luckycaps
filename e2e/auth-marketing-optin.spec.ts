import { expect, test, type Locator } from "@playwright/test";

import { getMarketingSubscriber, seedOrClearSubscriber } from "./helpers/marketing";
import { gotoAndWait } from "./helpers/navigation";
import { e2eEmail } from "./helpers/run";

test.use({ storageState: undefined });

async function fillStable(locator: Locator, value: string) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await locator.click();
    await locator.fill("");
    await locator.type(value, { delay: 8 });
    await locator.blur();
    await expect(locator).toHaveValue(value);
    await locator.page().waitForTimeout(200);
    const stableValue = await locator.inputValue();
    if (stableValue === value) return;
  }
  throw new Error(`Unable to keep stable input value "${value}" on sign-up form.`);
}

test.describe("auth marketing opt-in", () => {
  test.describe.configure({ mode: "serial", retries: 1 });

  test("sign-up marketing opt-in creates linked subscriber", async ({ page }, testInfo) => {
    test.setTimeout(120_000);

    const stamp = Date.now();
    const email = e2eEmail(`signup-optin-${stamp}`);
    const password = `E2E!Pass${stamp}9`;

    await seedOrClearSubscriber(page, email, "clear");

    await gotoAndWait(page, "/auth/sign-up", { testInfo, debugLabel: "auth-sign-up-marketing" });
    await page.waitForFunction(
      () => {
        const input = document.querySelector<HTMLInputElement>('[data-testid="signup-first-name"]');
        return Boolean(input && "_valueTracker" in input);
      },
      undefined,
      { timeout: 20_000 }
    );

    const firstName = page.getByTestId("signup-first-name");
    const lastName = page.getByTestId("signup-last-name");
    const emailInput = page.getByTestId("signup-email");
    const passwordInput = page.getByTestId("signup-password");
    const confirmInput = page.getByTestId("signup-password-confirm");

    await expect(firstName).toBeVisible({ timeout: 20_000 });
    await fillStable(firstName, "E2E");
    await fillStable(lastName, "Marketing");
    await fillStable(emailInput, email);
    await fillStable(passwordInput, password);
    await fillStable(confirmInput, password);

    await page.getByTestId("signup-terms").check();
    await expect(page.getByTestId("signup-terms")).toBeChecked();
    await page.getByTestId("signup-marketing-optin").check();
    await expect(page.getByTestId("signup-marketing-optin")).toBeChecked();

    const signupResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" && response.url().includes("/api/auth/signup"),
      { timeout: 8_000 }
    );
    await page.getByTestId("signup-submit").click();

    const signupResponse = await signupResponsePromise.catch(async () => {
      const formError =
        (await page
          .locator('[data-testid="signup-form"] p.text-red-400')
          .first()
          .textContent()
          .catch(() => null)) ?? "<none>";
      throw new Error(`Signup request not observed after submit click. Form error: ${formError}`);
    });
    const signupBody = await signupResponse.text();
    if (!signupResponse.ok()) {
      throw new Error(`Signup request failed (${signupResponse.status()}): ${signupBody || "<empty>"}`);
    }

    await expect(page).toHaveURL((url) => url.pathname === "/", { timeout: 30_000 });
    await expect(page.locator("main").first()).toBeVisible({ timeout: 20_000 });

    const subscriber = await getMarketingSubscriber(page, email);
    expect(subscriber.exists).toBeTruthy();
    expect(subscriber.count).toBe(1);
    expect(subscriber.subscriber?.status).toBe("subscribed");
    expect(subscriber.subscriber?.user_id).toBeTruthy();
  });
});
