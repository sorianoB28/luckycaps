import { expect, type Page } from "@playwright/test";

import { gotoAndWait } from "./navigation";

export type ReviewProduct = {
  id: string;
  slug: string;
  name: string;
};

export type ReviewSubmissionInput = {
  title: string;
  body: string;
  email: string;
  authorName?: string;
  rating?: 1 | 2 | 3 | 4 | 5;
};

export async function getFirstShopProduct(page: Page): Promise<ReviewProduct> {
  await gotoAndWait(page, "/shop", {
    timeout: 30_000,
    debugLabel: "shop-reviews",
  });

  const links = page.locator('a[href^="/product/"]');
  try {
    await links.first().waitFor({ state: "visible", timeout: 15_000 });
  } catch {
    return getReviewableProduct(page);
  }

  const count = await links.count();
  const shopSlugs: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const href = await links.nth(i).getAttribute("href");
    if (!href?.startsWith("/product/")) continue;
    const slug = href.replace(/^\/product\//, "").trim();
    if (slug && !shopSlugs.includes(slug)) {
      shopSlugs.push(slug);
    }
  }

  if (shopSlugs.length === 0) {
    return getReviewableProduct(page);
  }

  const response = await page.request.get("/api/products");
  if (!response.ok()) {
    throw new Error(`/api/products failed with status ${response.status()}`);
  }

  const products = (await response.json()) as Array<{
    id?: string;
    slug?: string;
    name?: string;
    active?: boolean;
    stock?: number;
  }>;

  const target = products.find(
    (product) =>
      Boolean(product?.id && product?.slug && product?.name) &&
      shopSlugs.includes(product.slug as string) &&
      (product.active ?? true) &&
      (product.stock ?? 0) > 0
  );

  if (!target?.id || !target.slug || !target.name) {
    return getReviewableProduct(page);
  }

  return { id: target.id, slug: target.slug, name: target.name };
}

export async function getReviewableProduct(page: Page): Promise<ReviewProduct> {
  const response = await page.request.get("/api/products");
  if (!response.ok()) {
    throw new Error(`/api/products failed with status ${response.status()}`);
  }

  const products = (await response.json()) as Array<{
    id?: string;
    slug?: string;
    name?: string;
    active?: boolean;
    stock?: number;
  }>;

  const target = products.find(
    (product) => Boolean(product?.id && product?.slug && product?.name) &&
      (product.active ?? true) &&
      (product.stock ?? 0) > 0
  );

  if (!target?.id || !target.slug || !target.name) {
    throw new Error("No active in-stock product found for review eligibility test.");
  }

  return { id: target.id, slug: target.slug, name: target.name };
}

export async function seedPaidOrderForReview(page: Page, params: { productId: string; email: string }) {
  const response = await page.request.post("/api/dev/seed-paid-order-for-review", {
    data: {
      productId: params.productId,
      email: params.email,
    },
  });

  const text = await response.text();
  if (!response.ok()) {
    throw new Error(
      `Unable to seed paid order for review. Status ${response.status()}. Response: ${text}`
    );
  }

  let body: { ok?: boolean; orderId?: string } | null = null;
  try {
    body = JSON.parse(text) as { ok?: boolean; orderId?: string };
  } catch {
    body = null;
  }

  if (!body?.ok || !body.orderId) {
    throw new Error(`Unexpected seed-paid-order response: ${text}`);
  }

  return body.orderId;
}

export async function openReviewModal(page: Page, productSlug: string) {
  await gotoAndWait(page, `/product/${productSlug}`, {
    timeout: 30_000,
    debugLabel: `product-${productSlug}-reviews`,
  });

  const openButton = page.getByTestId("review-open-modal").first();
  await openButton.scrollIntoViewIfNeeded();
  await expect(openButton).toBeVisible({ timeout: 20_000 });
  await openButton.click();

  await expect(page.getByTestId("review-modal")).toBeVisible({ timeout: 20_000 });
}

export async function submitReview(page: Page, input: ReviewSubmissionInput) {
  const rating = input.rating ?? 5;

  const ratingButtons = page.getByTestId("review-form-rating").locator("button");
  await expect(ratingButtons.nth(rating - 1)).toBeVisible({ timeout: 20_000 });
  await ratingButtons.nth(rating - 1).click();

  await page.getByTestId("review-title-input").fill(input.title);
  await page.getByTestId("review-body-input").fill(input.body);
  await page.getByTestId("review-email-input").fill(input.email);

  if (input.authorName) {
    await page.getByTestId("review-name-input").fill(input.authorName);
  }

  const postResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes("/api/reviews")
  );

  await page.getByTestId("review-submit-button").click();

  const postResponse = await postResponsePromise;
  const status = postResponse.status();

  let json: unknown = null;
  try {
    json = await postResponse.json();
  } catch {
    json = null;
  }

  return { status, json };
}
