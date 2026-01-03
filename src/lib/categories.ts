import { buildCloudinaryCardUrl, isCloudinaryUrl } from "@/lib/cloudinaryUrl";
import { getPlaceholderImages } from "@/lib/placeholderImages";

export type CategoryInfo = {
  key: string;
  label: string;
  imageUrl: string;
  slug: string;
};

export function normalizeCategoryName(value: string): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "";
  return trimmed
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
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
    return isCloudinaryUrl(primary)
      ? buildCloudinaryCardUrl(primary)
      : primary;
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
    const key = (product.category ?? "").trim().toLowerCase();
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
