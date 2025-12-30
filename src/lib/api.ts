// src/lib/api.ts
export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  image_url?: string | null;
  price_cents: number;
  sale_price_cents: number | null;
  original_price_cents: number | null;
  is_new_drop: boolean;
  is_sale: boolean;
  tags: string[] | null;
  features: string[] | null;
  stock: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  // added:
  image_url?: string | null;
};

export type ProductImageRow = {
  id: string;
  product_id: string;
  url: string;
  sort_order: number | null;
  created_at: string;
};

export type ProductSizeRow = {
  id: string;
  product_id: string;
  name: string;
  created_at: string;
};

export type ProductVariantRow = {
  id: string;
  product_id: string;
  name: string;
  created_at: string;
};

export type ReviewRow = {
  id: string;
  product_id: string;
  product_slug: string;
  rating: number;
  title: string;
  body: string;
  author_email: string;
  author_name: string | null;
  variant: string | null;
  size: string | null;
  images: string[] | null;
  verified_purchase: boolean;
  helpful_count: number;
  reported: boolean;
  created_at: string;
};

export type ProductDetailResponse = {
  product: Product;
  images: ProductImageRow[];
  sizes: ProductSizeRow[];
  variants: ProductVariantRow[];
  reviewSummary: { count: number; avgRating: number | null };
  reviews: ReviewRow[];
};

function getServerBaseUrl() {
  // When running in the browser, we should use relative URLs.
  // This function only runs on server.
  const isNetlifyDev =
    process.env.NETLIFY_DEV === "true" || process.env.NETLIFY_DEV === "1";

  if (isNetlifyDev) {
    const port = process.env.PORT || "8888";
    return `http://localhost:${port}`;
  }

  // Netlify production / preview
  const netlifyUrl =
    process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.SITE_URL;
  if (netlifyUrl) return netlifyUrl;

  // fallback local Next dev
  const port = process.env.PORT || "3000";
  return `http://localhost:${port}`;
}

function resolveUrl(path: string) {
  // absolute already
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  // client should use relative
  if (typeof window !== "undefined") return path;

  // server needs absolute
  const base = getServerBaseUrl();
  return new URL(path, base).toString();
}

async function fetchJson<T>(path: string): Promise<T> {
  const url = resolveUrl(path);
  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Request to ${url} failed with status ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function getProducts() {
  return fetchJson<Product[]>("/api/products");
}

export async function getProductBySlug(slug: string) {
  return fetchJson<ProductDetailResponse>(`/api/products/${slug}`);
}
