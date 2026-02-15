import HomePageClient from "@/components/home/HomePageClient";
import { buildCloudinaryCardUrl } from "@/lib/cloudinaryUrl";
import { getProducts, type Product as ApiProduct } from "@/lib/api";
import { getCategoriesFromProducts, type CategoryInfo } from "@/lib/categories";
import { normalizeSize, sortSizes } from "@/lib/sizeOptions";
import { Product } from "@/types";

export const dynamic = "force-dynamic";

const NEW_DROPS_LIMIT = 6;
const HOME_ROUTE = "HOME_PAGE_RENDER";

function logHomeError(event: string, context: Record<string, unknown>, error?: unknown) {
  const runId = process.env.E2E_RUN_ID ?? null;
  // eslint-disable-next-line no-console
  console.error(`[${HOME_ROUTE}] ${event}`, {
    route: "/",
    runId,
    ...context,
    error:
      error instanceof Error
        ? { message: error.message, stack: error.stack }
        : error ?? null,
  });
}

function logHomeWarn(event: string, context: Record<string, unknown>) {
  const runId = process.env.E2E_RUN_ID ?? null;
  // eslint-disable-next-line no-console
  console.warn(`[${HOME_ROUTE}] ${event}`, {
    route: "/",
    runId,
    ...context,
  });
}

const isRecentDrop = (item: ApiProduct) => {
  if (!item?.created_at) return false;
  const createdAtMs = Date.parse(String(item.created_at));
  if (!Number.isFinite(createdAtMs)) return false;
  return Date.now() - createdAtMs <= 1000 * 60 * 60 * 24 * 30;
};

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
}

const mapApiProductToUiProduct = (item: ApiProduct, index: number): Product => {
  const rawId =
    typeof item?.id === "string" && item.id.trim().length
      ? item.id.trim()
      : `home-product-${index}`;
  const rawSlug =
    typeof item?.slug === "string" && item.slug.trim().length
      ? item.slug.trim()
      : rawId;
  const rawName =
    typeof item?.name === "string" && item.name.trim().length
      ? item.name.trim()
      : rawSlug;
  const category =
    typeof item?.category === "string" && item.category.trim().length
      ? item.category.trim()
      : "general";

  const image =
    typeof item?.image_url === "string" && item.image_url.trim().length
      ? buildCloudinaryCardUrl(item.image_url)
      : "";

  const rawSizes = Array.isArray(item?.sizes) ? item.sizes : [];
  if (!Array.isArray(item?.sizes) && item?.sizes != null) {
    logHomeWarn("UNEXPECTED_SIZES_TYPE", {
      productId: rawId,
      slug: rawSlug,
      sizesType: typeof item.sizes,
    });
  }

  const sizes = sortSizes(
    rawSizes
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .map((s) => normalizeSize(s))
      .filter((s): s is NonNullable<typeof s> => Boolean(s))
  );

  const basePriceCents = toNumber(item?.price_cents, 0);
  const salePriceCents =
    item?.sale_price_cents == null ? null : toNumber(item.sale_price_cents, basePriceCents);
  const originalPriceCents =
    item?.original_price_cents == null ? null : toNumber(item.original_price_cents, basePriceCents);
  const isSale = Boolean(item?.is_sale && salePriceCents != null);
  const effectivePriceCents = isSale && salePriceCents != null ? salePriceCents : basePriceCents;

  return {
    id: rawId,
    slug: rawSlug,
    name: rawName,
    name_en: item?.name_en ?? null,
    name_es: item?.name_es ?? null,
    price: effectivePriceCents / 100,
    salePrice: salePriceCents != null ? salePriceCents / 100 : undefined,
    originalPrice: originalPriceCents != null ? originalPriceCents / 100 : undefined,
    images: image ? [image] : [],
    category,
    tags: toStringArray(item?.tags),
    description: item?.description ?? "",
    description_en: item?.description_en ?? null,
    description_es: item?.description_es ?? null,
    features: toStringArray(item?.features),
    isNewDrop: Boolean(item?.is_new_drop) || isRecentDrop(item),
    isSale,
    variants: [],
    sizes,
    stock: toNumber(item?.stock, 0),
    translation_source_locale: (item?.translation_source_locale as "EN" | "ES" | null) ?? null,
    translated_at: item?.translated_at ?? item?.translation_updated_at ?? null,
    translation_updated_at: item?.translation_updated_at ?? null,
  };
};

const sortByCreatedDesc = (a: ApiProduct, b: ApiProduct) =>
  new Date(b?.created_at ?? 0).getTime() - new Date(a?.created_at ?? 0).getTime();

export default async function HomePage() {
  let newDrops: Product[] = [];
  let categories: CategoryInfo[] = [];

  try {
    const productsRaw = await getProducts();
    const products = Array.isArray(productsRaw)
      ? productsRaw.filter((product): product is ApiProduct => Boolean(product && typeof product === "object"))
      : [];

    if (!Array.isArray(productsRaw)) {
      logHomeWarn("PRODUCTS_NOT_ARRAY", {
        productsType: typeof productsRaw,
      });
    } else if (products.length !== productsRaw.length) {
      logHomeWarn("PRODUCTS_FILTERED_NULLISH", {
        originalLength: productsRaw.length,
        filteredLength: products.length,
      });
    }

    try {
      categories = getCategoriesFromProducts(products ?? []);
    } catch (err) {
      categories = [];
      logHomeError(
        "CATEGORY_MAPPING_FAILED",
        {
          productsCount: products.length,
          sampleProduct: products[0]
            ? {
                id: products[0].id ?? null,
                slug: products[0].slug ?? null,
                category: products[0].category ?? null,
              }
            : null,
        },
        err
      );
    }

    const candidateDrops = products
      .filter((product) => Boolean(product) && (product.is_new_drop || isRecentDrop(product)))
      .sort(sortByCreatedDesc)
      .slice(0, NEW_DROPS_LIMIT);

    newDrops = candidateDrops
      .map((product, index) => {
        try {
          return mapApiProductToUiProduct(product, index);
        } catch (err) {
          logHomeError(
            "PRODUCT_MAP_FAILED",
            {
              index,
              productId: product?.id ?? null,
              slug: product?.slug ?? null,
              category: product?.category ?? null,
            },
            err
          );
          return null;
        }
      })
      .filter((item): item is Product => Boolean(item));
  } catch (err) {
    // Leave data empty on error to avoid breaking the home page.
    logHomeError("TOP_LEVEL_FETCH_FAILED", { newDropsLength: newDrops.length, categoriesLength: categories.length }, err);
  }

  return <HomePageClient newDrops={newDrops ?? []} categories={categories ?? []} />;
}

