import { expect, test } from "@playwright/test";

import {
  getReviewableProduct,
  openReviewModal,
  seedPaidOrderForReview,
  submitReview,
} from "./helpers/reviews";
import { RUN_ID, e2eEmail } from "./helpers/run";

test.use({ storageState: undefined });

test("review is blocked unless purchased", async ({ page }) => {
  test.setTimeout(120_000);

  const product = await getReviewableProduct(page);
  const stamp = Date.now();

  const nonPurchaserEmail = e2eEmail(`nonbuyer-${stamp}`);
  const purchaserEmail = e2eEmail(`buyer-${stamp}`);

  const blockedTitle = `E2E blocked review ${RUN_ID} ${stamp}`;
  const allowedTitle = `E2E verified review ${RUN_ID} ${stamp}`;

  await openReviewModal(page, product.slug);

  const blockedAttempt = await submitReview(page, {
    title: blockedTitle,
    body: "Attempting review without purchase should be blocked.",
    email: nonPurchaserEmail,
    authorName: "E2E Non Buyer",
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
    email: purchaserEmail,
  });

  const allowedAttempt = await submitReview(page, {
    title: allowedTitle,
    body: "This review should pass because this email now has a paid order.",
    email: purchaserEmail,
    authorName: "E2E Buyer",
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
