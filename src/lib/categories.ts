import { buildCloudinaryCardUrl, isCloudinaryUrl } from "@/lib/cloudinaryUrl";
import { getPlaceholderImages } from "@/lib/placeholderImages";

export type CategoryInfo = {
  key: string;
  label: string;
  imageUrl: string;
  slug: string;
};

export type DynamicCategory = {
  key: string;
  slug: string;
  count: number;
};

export const PREFERRED_CATEGORY_ORDER = [
  "snapbacks",
  "fitted",
  "trucker",
  "beanies",
  "custom",
] as const;

export const CATEGORY_TRANSLATION_KEYS = [
  "snapbacks",
  "fitted",
  "trucker",
  "beanies",
  "custom",
  "dad_hat",
  "rope",
  "five_panel",
  "flat_bill",
  "caps",
  "gorra",
  "snapbacks_2pk",
] as const;

const CATEGORY_KEY_ALIASES: Record<string, string> = {
  snapback: "snapbacks",
  snapbacks: "snapbacks",
  "snap backs": "snapbacks",
  fitted: "fitted",
  "fitted cap": "fitted",
  "fitted caps": "fitted",
  trucker: "trucker",
  truckers: "trucker",
  beanie: "beanies",
  beanies: "beanies",
  custom: "custom",
  "custom cap": "custom",
  "custom caps": "custom",
  cap: "caps",
  caps: "caps",
  gorra: "gorra",
  gorras: "caps",
  "snapbacks 2pk": "snapbacks_2pk",
  "snapbacks 2 pack": "snapbacks_2pk",
  "snapbacks 2-pack": "snapbacks_2pk",
  "dad hat": "dad_hat",
  "dad hats": "dad_hat",
  rope: "rope",
  "rope hat": "rope",
  "rope hats": "rope",
  "five panel": "five_panel",
  "five panels": "five_panel",
  "5 panel": "five_panel",
  "flat bill": "flat_bill",
  "flat brim": "flat_bill",
};

function toLookupToken(value?: string | null): string {
  return (value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeCategorySlug(value?: string | null): string {
  return (value ?? "").trim().toLowerCase();
}

export function normalizeCategoryKey(value?: string | null): string {
  const token = toLookupToken(value);
  if (!token) return "";
  return CATEGORY_KEY_ALIASES[token] ?? token.replace(/\s+/g, "_");
}

export function normalizeCategoryName(value?: string | null): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "";
  return trimmed
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function sortDynamicCategories<T extends { key: string; slug: string }>(
  categories: T[]
): T[] {
  const preferredIndex = new Map<string, number>(
    PREFERRED_CATEGORY_ORDER.map((key, index) => [key, index])
  );

  return [...categories].sort((a, b) => {
    const aKnown = preferredIndex.get(a.key);
    const bKnown = preferredIndex.get(b.key);

    if (aKnown != null && bKnown != null) return aKnown - bKnown;
    if (aKnown != null) return -1;
    if (bKnown != null) return 1;

    return normalizeCategoryName(a.slug).localeCompare(normalizeCategoryName(b.slug), "en");
  });
}

type ProductLike = {
  category: string;
  image_url?: string | null;
  images?: string[];
  slug?: string;
  name?: string;
  id?: string;
};

function pickProductImage(product: ProductLike): string {
  const primary =
    product.image_url && product.image_url.trim().length
      ? product.image_url
      : product.images && product.images.length
      ? product.images[0]
      : "";

  if (primary) {
    return isCloudinaryUrl(primary) ? buildCloudinaryCardUrl(primary) : primary;
  }

  const placeholder = getPlaceholderImages(
    product.category ?? "General",
    product.slug ?? product.name ?? product.id ?? "category",
    1
  )[0];
  return placeholder ?? "/images/placeholder-product.svg";
}

export function getCategoriesFromProducts<T extends ProductLike>(
  products: T[]
): CategoryInfo[] {
  const map = new Map<string, CategoryInfo>();

  products.forEach((product) => {
    const key = normalizeCategorySlug(product.category);
    if (!key || map.has(key)) return;
    map.set(key, {
      key,
      label: normalizeCategoryName(product.category),
      imageUrl: pickProductImage(product),
      slug: key,
    });
  });

  return Array.from(map.values());
}
