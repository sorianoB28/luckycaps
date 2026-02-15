import { expect, type Page } from "@playwright/test";

import { gotoAndWait } from "./navigation";
import { waitForAppReady } from "./appReady";

const TIMEOUT = 20_000;

async function readProductLinks(page: Page) {
  const productLinks = page.locator('a[href^="/product/"]');
  try {
    await productLinks.first().waitFor({ state: "visible", timeout: 15_000 });
  } catch {
    // Fall through to count + API fallback.
  }
  const count = await productLinks.count();

  const paths: string[] = [];
  for (let idx = 0; idx < count; idx += 1) {
    const href = await productLinks.nth(idx).getAttribute("href");
    if (!href || !href.startsWith("/product/")) continue;
    if (!paths.includes(href)) paths.push(href);
  }

  if (paths.length > 0) {
    return paths;
  }

  const response = await page.request.get("/api/products");
  if (!response.ok()) {
    throw new Error(
      `No product cards were visible on /shop and /api/products failed with status ${response.status()}.`
    );
  }

  const products = (await response.json()) as Array<{
    slug?: string;
    stock?: number | null;
    active?: boolean | null;
  }>;

  const fallbackPaths = products
    .filter((product) => Boolean(product?.slug))
    .filter((product) => (product.stock ?? 0) > 0)
    .map((product) => `/product/${product.slug}`);

  if (fallbackPaths.length === 0) {
    throw new Error(
      "No product cards were visible on /shop and no in-stock products were returned by /api/products."
    );
  }

  return [...new Set(fallbackPaths)];
}

async function openFirstAddableProduct(page: Page) {
  await gotoAndWait(page, "/shop", { timeout: TIMEOUT, debugLabel: "shop" });
  const productPaths = await readProductLinks(page);

  for (const path of productPaths) {
    await gotoAndWait(page, path, { timeout: TIMEOUT, debugLabel: `product-${path}` });
    await waitForAppReady(page, { timeout: TIMEOUT });

    const addToCartButton = page.getByTestId("product-add-to-cart").first();
    try {
      await addToCartButton.waitFor({ state: "visible", timeout: 15_000 });
    } catch {
      continue;
    }

    if (await addToCartButton.isEnabled()) {
      return;
    }
  }

  throw new Error(
    `Found product pages, but none had an enabled add-to-cart button. Last URL visited: ${page.url()}`
  );
}

async function setProductQuantityToOne(page: Page) {
  const quantityDisplay = page.getByTestId("product-quantity").first();
  const decreaseButton = page.getByTestId("product-quantity-decrease").first();

  await expect(quantityDisplay).toBeVisible({ timeout: TIMEOUT });
  await expect(decreaseButton).toBeVisible({ timeout: TIMEOUT });

  for (let attempts = 0; attempts < 8; attempts += 1) {
    const qtyText = (await quantityDisplay.textContent())?.trim() ?? "";
    const qty = Number.parseInt(qtyText, 10);

    if (Number.isNaN(qty)) {
      throw new Error(`Could not parse product quantity from "${qtyText}" at ${page.url()}`);
    }

    if (qty === 1) return;
    if (qty < 1) {
      throw new Error(`Product quantity became invalid (${qty}) at ${page.url()}`);
    }

    await decreaseButton.click();
  }

  throw new Error(`Failed to set product quantity to 1 at ${page.url()}`);
}

export async function addFirstActiveProductToCart(page: Page) {
  await openFirstAddableProduct(page);
  await setProductQuantityToOne(page);

  const addToCartButton = page.getByTestId("product-add-to-cart").first();
  await expect(addToCartButton).toBeEnabled({ timeout: TIMEOUT });
  await addToCartButton.click();

  const cartCount = page.getByTestId("cart-count").first();
  await expect(cartCount).toBeVisible({ timeout: TIMEOUT });
  await expect(cartCount).toHaveText("1", { timeout: TIMEOUT });

  await gotoAndWait(page, "/cart", { timeout: TIMEOUT, debugLabel: "cart" });

  const firstLineItem = page.getByTestId("cart-line-item").first();
  await expect(firstLineItem).toBeVisible({ timeout: TIMEOUT });

  const firstQuantity = firstLineItem.getByTestId("cart-item-quantity").first();
  await expect(firstQuantity).toHaveText("1", { timeout: TIMEOUT });
}
