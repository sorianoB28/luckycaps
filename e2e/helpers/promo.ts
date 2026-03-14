import { expect, type Locator, type Page } from "@playwright/test";

export type PromoSpec = {
  code: string;
  type: "percent" | "amount";
  value: number;
  valueCents?: number;
  active?: boolean;
  minSubtotalCents?: number;
  startsAt?: string | null;
  endsAt?: string | null;
  maxRedemptions?: number | null;
  timesRedeemed?: number | null;
};

type SeedPromoResponse = {
  ok: boolean;
  promo?: {
    id: string;
    code: string;
    active: boolean;
    discount_type: "percent" | "amount";
    percent_off: number | null;
    amount_off_cents: number | null;
    stripe_coupon_id: string | null;
  };
  error?: string;
};

const TIMEOUT = 20_000;
const MONEY_PATTERN = /-?\$?\d[\d,]*\.\d{2}/;

function parseMoneyToCents(text: string): number | null {
  const cleaned = text.replace(/[^0-9.-]/g, "").trim();
  if (!cleaned) return null;
  const amount = Number.parseFloat(cleaned);
  if (!Number.isFinite(amount)) return null;
  return Math.round(amount * 100);
}

async function readText(locator: Locator) {
  try {
    const value = await locator.first().textContent();
    return (value ?? "").trim();
  } catch {
    return "";
  }
}

export async function readCheckoutTotals(page: Page) {
  const subtotalText =
    (await readText(page.getByTestId("checkout-summary-subtotal-value"))) ||
    (await readText(page.getByTestId("checkout-subtotal-value")));
  const taxText =
    (await readText(page.getByTestId("checkout-tax-value"))) ||
    (await readText(page.getByTestId("checkout-summary-tax-value")));
  const shippingText =
    (await readText(page.getByTestId("checkout-summary-shipping-value"))) ||
    (await readText(page.getByTestId("checkout-shipping-value")));
  const totalText =
    (await readText(page.getByTestId("checkout-summary-total-value"))) ||
    (await readText(page.getByTestId("checkout-total-value")));

  return {
    subtotalText,
    taxText,
    shippingText,
    totalText,
    subtotalCents: parseMoneyToCents(subtotalText),
    taxCents: parseMoneyToCents(taxText),
    shippingCents: parseMoneyToCents(shippingText),
    totalCents: parseMoneyToCents(totalText),
  };
}

export async function seedPromo(page: Page, promoSpec: PromoSpec) {
  const response = await page.request.post("/api/dev/seed-promo", {
    data: {
      code: promoSpec.code,
      type: promoSpec.type,
      value: promoSpec.value,
      valueCents: promoSpec.valueCents,
      active: promoSpec.active ?? true,
      minSubtotalCents: promoSpec.minSubtotalCents,
      startsAt: promoSpec.startsAt ?? null,
      endsAt: promoSpec.endsAt ?? null,
      maxRedemptions: promoSpec.maxRedemptions ?? null,
      timesRedeemed: promoSpec.timesRedeemed ?? null,
    },
  });

  const bodyText = await response.text();
  let body: SeedPromoResponse | null = null;
  try {
    body = JSON.parse(bodyText) as SeedPromoResponse;
  } catch {
    body = null;
  }

  if (!response.ok()) {
    throw new Error(
      `Failed to seed promo code ${promoSpec.code}. Status ${response.status()}. Response: ${bodyText}`
    );
  }

  if (!body?.ok || !body.promo) {
    throw new Error(
      `Seed promo route returned unexpected payload for ${promoSpec.code}: ${bodyText}`
    );
  }

  return body.promo;
}

export async function applyPromoOnCheckout(page: Page, code: string) {
  const promoInput = page.getByTestId("checkout-promo-input").first();
  const applyButton = page.getByTestId("checkout-promo-apply").first();
  const totalValue = page.getByTestId("checkout-summary-total-value").first();
  const promoStatus = page.getByTestId("checkout-promo-status").first();
  const discountRow = page.getByTestId("checkout-summary-discount-row").first();

  await expect(promoInput).toBeVisible({ timeout: TIMEOUT });
  await expect(applyButton).toBeVisible({ timeout: TIMEOUT });
  await expect(totalValue).toHaveText(MONEY_PATTERN, { timeout: TIMEOUT });

  const before = await readCheckoutTotals(page);
  const totalBefore = before.totalCents;

  await promoInput.fill(code);
  await applyButton.click();

  await expect
    .poll(
      async () => {
        const statusText = await readText(page.getByTestId("checkout-promo-status"));
        const totals = await readCheckoutTotals(page);
        const discountVisible = await discountRow.isVisible().catch(() => false);
        const totalDecreased =
          totalBefore != null &&
          totals.totalCents != null &&
          totals.totalCents < totalBefore;
        const appliedStatus = /applied|aplicad/i.test(statusText);
        return discountVisible || totalDecreased || appliedStatus;
      },
      { timeout: TIMEOUT }
    )
    .toBeTruthy();

  const statusText = await readText(promoStatus);
  const after = await readCheckoutTotals(page);
  const discountVisible = await discountRow.isVisible().catch(() => false);
  const hasAppliedStatus = /applied|aplicad/i.test(statusText);
  const hasErrorStatus =
    !hasAppliedStatus &&
    /invalid|expired|inactive|not found|min|max|unable|error|inv[aá]lido|expir|inactiv|m[ií]nimo|no v[aá]lido/i.test(
      statusText
    );
  const totalDecreased =
    totalBefore != null &&
    after.totalCents != null &&
    after.totalCents < totalBefore;

  if (hasErrorStatus) {
    throw new Error(
      `Promo apply failed for "${code}". Status="${statusText}". Totals before: subtotal=${before.subtotalText}, shipping=${before.shippingText}, total=${before.totalText}. Totals after: subtotal=${after.subtotalText}, shipping=${after.shippingText}, total=${after.totalText}.`
    );
  }

  if (!discountVisible && !totalDecreased && !hasAppliedStatus) {
    throw new Error(
      `Promo apply did not reach an applied state for "${code}". Status="${statusText || "<empty>"}". Totals before: subtotal=${before.subtotalText}, shipping=${before.shippingText}, total=${before.totalText}. Totals after: subtotal=${after.subtotalText}, shipping=${after.shippingText}, total=${after.totalText}.`
    );
  }
}

export async function applyPromoExpectError(page: Page, code: string) {
  const promoInput = page.getByTestId("checkout-promo-input").first();
  const applyButton = page.getByTestId("checkout-promo-apply").first();
  const promoStatus = page.getByTestId("checkout-promo-status").first();

  await expect(promoInput).toBeVisible({ timeout: TIMEOUT });
  await expect(applyButton).toBeVisible({ timeout: TIMEOUT });

  const before = await readCheckoutTotals(page);

  await promoInput.fill(code);
  await applyButton.click();

  await expect(promoStatus).toBeVisible({ timeout: TIMEOUT });
  const statusText = await readText(promoStatus);
  const isErrorStatus =
    !/applied|aplicad/i.test(statusText) &&
    statusText.trim().length > 0;
  if (!isErrorStatus) {
    throw new Error(`Expected promo error for "${code}", got status "${statusText || "<empty>"}"`);
  }

  const after = await readCheckoutTotals(page);
  return { before, after, statusText };
}

