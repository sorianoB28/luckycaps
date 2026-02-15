import { expect, test } from "@playwright/test";

import {
  getFirstShopProduct,
  openReviewModal,
  seedPaidOrderForReview,
  submitReview,
} from "./helpers/reviews";
import { RUN_ID, e2eEmail } from "./helpers/run";

function resolveGuestEmail(stamp: number) {
  const configured = process.env.E2E_GUEST_EMAIL?.trim().toLowerCase();
  if (!configured) {
    return e2eEmail(`guest-${stamp}`);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(configured)) {
    throw new Error("E2E_GUEST_EMAIL is set but not a valid email address.");
  }

  return configured;
}

test.use({ storageState: undefined });

test("guest email can review only after paid order exists", async ({ page }) => {
  test.setTimeout(120_000);

  const product = await getFirstShopProduct(page);
  const stamp = Date.now();

  const nonPurchaserEmail = e2eEmail(`guest-nonbuyer-${stamp}`);
  const guestEmail = resolveGuestEmail(stamp);

  const blockedTitle = `E2E guest blocked ${RUN_ID} ${stamp}`;
  const allowedTitle = `E2E guest verified ${RUN_ID} ${stamp}`;

  await openReviewModal(page, product.slug);

  const blockedAttempt = await submitReview(page, {
    title: blockedTitle,
    body: "Guest review without a paid order should be blocked.",
    email: nonPurchaserEmail,
    authorName: "E2E Guest Non Buyer",
    rating: 5,
  });

  expect([403, 404]).toContain(blockedAttempt.status);
  if (blockedAttempt.status === 403) {
    expect((blockedAttempt.json as { error?: string } | null)?.error).toBe("only_purchasers");
  }

  const blockedError = page.getByTestId("review-submit-error").first();
  await expect(blockedError).toBeVisible({ timeout: 20_000 });
  await expect(blockedError).toContainText(/purchas|compr/i);

  await seedPaidOrderForReview(page, {
    productId: product.id,
    email: guestEmail,
  });

  const allowedAttempt = await submitReview(page, {
    title: allowedTitle,
    body: "Guest review should pass once a paid order exists for this email.",
    email: guestEmail,
    authorName: "E2E Guest Buyer",
    rating: 5,
  });

  expect(allowedAttempt.status).toBe(201);

  const reviewModal = page.getByTestId("review-modal").first();
  await expect(reviewModal).toBeHidden({ timeout: 30_000 });

  const reviewItem = page
    .getByTestId("review-item")
    .filter({ has: page.getByTestId("review-item-title").filter({ hasText: allowedTitle }) })
    .first();

  await expect(reviewItem).toBeVisible({ timeout: 30_000 });
  await expect(reviewItem.getByTestId("review-verified-badge").first()).toBeVisible({
    timeout: 30_000,
  });
});
