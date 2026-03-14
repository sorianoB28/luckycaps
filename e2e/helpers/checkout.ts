import { expect, type Page } from "@playwright/test";

const TIMEOUT = 20_000;

export async function selectFlatShipping(page: Page) {
  const option = page.getByTestId("shipping-option-flat").first();
  await expect(option).toBeVisible({ timeout: TIMEOUT });
  await option.click();
  await expect(page.getByTestId("checkout-shipping-value").first()).toHaveText(/\$6\.00/, {
    timeout: TIMEOUT,
  });
  await expect(page.getByTestId("checkout-total-value").first()).toHaveText(/\$\d+\.\d{2}/, {
    timeout: TIMEOUT,
  });
}
