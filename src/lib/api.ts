// src/lib/api.ts
export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  image_url: string | null;
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
  sizes: string[];
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

export type Review = {
  id: string;
  product_slug: string;
  product_id?: string;
  rating: number;
  title: string;
  body: string;
  author_email?: string;
  author_name: string | null;
  variant: string | null;
  size: string | null;
  images: string[];
  verified_purchase: boolean;
  helpful_count: number;
  reported?: boolean;
  created_at: string;
};

export type ProductDetailResponse = {
  product: Product;
  images: ProductImageRow[];
  sizes: ProductSizeRow[];
  variants: ProductVariantRow[];
  reviewSummary: { count: number; avgRating: number | null };
  reviews: Review[];
};

export type ReviewsSummary = {
  avg_rating: number | null;
  review_count: number;
};

export type ReviewsResponse = {
  reviews: Review[];
  summary: ReviewsSummary;
};

export type CreateReviewPayload = {
  product_id: string;
  product_slug: string;
  rating: number;
  title: string;
  body: string;
  author_email: string;
  author_name?: string | null;
  variant?: string | null;
  size?: string | null;
  images?: string[];
};

export type AdminProduct = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  price_cents: number;
  sale_price_cents: number | null;
  original_price_cents: number | null;
  is_new_drop: boolean;
  is_sale: boolean;
  tags: string[];
  features: string[];
  stock: number;
  active: boolean;
  created_at: string;
  image_url: string | null;
  images: string[];
  sizes: string[];
};

export type AdminImageInput = { url: string; publicId?: string | null };

export type AdminProductPayload = {
  name: string;
  slug: string;
  category: string;
  description: string;
  price: number;
  salePrice?: number | null;
  originalPrice?: number | null;
  isSale: boolean;
  isNewDrop: boolean;
  stock: number;
  images: AdminImageInput[];
  sizes: string[];
  active?: boolean;
};

export type CheckoutItemInput = {
  product_id?: string | null;
  product_slug: string;
  name: string;
  image_url?: string | null;
  variant?: string | null;
  size?: string | null;
  quantity: number;
  unit_price_cents: number;
};

export type CheckoutPayload = {
  contact: { email: string; phone?: string | null };
  shippingAddress: {
    firstName: string;
    lastName: string;
    address1: string;
    address2?: string | null;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  deliveryOption: string;
  promoCode?: string | null;
  notes?: string | null;
  items: {
    productId: string;
    quantity: number;
    size?: string | null;
    variant?: string | null;
  }[];
};

export type CheckoutResponse = {
  url: string;
};

export type AdminOrder = {
  id: string;
  created_at: string;
  status: "created" | "paid" | "shipped" | "delivered" | "cancelled" | "refunded";
  email: string;
  user_id?: string | null;
  account_email?: string | null;
  account_name?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  subtotal_cents: number;
  items_count: number;
  tracking_number?: string | null;
  admin_notes?: string | null;
  paid_at?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
  refunded_at?: string | null;
};

export type AdminOrdersResponse = {
  orders: AdminOrder[];
  nextCursor?: string | null;
};

export type AdminOrderDetail = AdminOrder & {
  contact?: Record<string, unknown> | null;
  shipping_address?: Record<string, unknown> | null;
  delivery_option?: string | null;
  promo_code?: string | null;
  first_order_at?: string | null;
  order_count?: number;
};

export type AdminOrderItem = {
  product_slug: string;
  name: string;
  image_url: string | null;
  price_cents: number;
  variant: string | null;
  size: string | null;
  quantity: number;
};

export type AdminParcelTemplate = {
  id: string;
  name: string;
  length: number;
  width: number;
  height: number;
  distance_unit: string;
  weight?: number | null;
  mass_unit: string;
  min_items?: number | null;
  max_items?: number | null;
  tags?: string[] | null;
  label_format_default?: string | null;
};

export type AdminShipmentRate = {
  id: string;
  amount: number;
  currency: string;
  provider: string;
  service: string;
  service_token?: string | null;
  estimated_days?: number | null;
  duration_terms?: string | null;
};

export type AdminShipmentParcel = {
  length: number;
  width: number;
  height: number;
  distance_unit: string;
  weight: number;
  mass_unit: string;
};

export type AdminShipment = {
  id?: string;
  order_id?: string;
  status?: string;
  parcel?: AdminShipmentParcel | null;
  parcel_template_id?: string | null;
  rates?: AdminShipmentRate[];
  selected_rate?: AdminShipmentRate | Record<string, unknown> | null;
  label_url?: string | null;
  label_asset_url?: string | null;
  label_asset_provider?: string | null;
  label_asset_public_id?: string | null;
  label_purchased_at?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  label_format?: string | null;
  provider_rate_id?: string | null;
  provider_shipment_id?: string | null;
  shippo_transaction_id?: string | null;
  postage_amount?: number | null;
  postage_currency?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AdminShippingDefaults = {
  label_format?: string | null;
  default_parcel_template_id?: string | null;
};

export type AdminShippingResponse = {
  shipment: AdminShipment | null;
  rates: AdminShipmentRate[];
  parcel_templates: AdminParcelTemplate[];
  defaults?: AdminShippingDefaults | null;
  template_notice?: string | null;
};

export type AdminPromoCode = {
  id: string;
  code: string;
  active: boolean;
  discount_type: "percent" | "amount";
  percent_off: number | null;
  amount_off_cents: number | null;
  currency: string | null;
  min_subtotal_cents: number | null;
  max_redemptions: number | null;
  times_redeemed: number | null;
  starts_at: string | null;
  ends_at: string | null;
  stripe_coupon_id: string | null;
  created_at: string;
  updated_at: string;
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

export async function createCheckout(payload: CheckoutPayload) {
  const url = resolveUrl("/api/checkout");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let message = `Request to ${url} failed with status ${res.status}`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) message = data.error;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  return res.json() as Promise<CheckoutResponse>;
}

export async function getReviews(productSlug: string) {
  return fetchJson<ReviewsResponse>(
    `/api/reviews?product_slug=${encodeURIComponent(productSlug)}`
  );
}

export async function createReview(payload: CreateReviewPayload) {
  const url = resolveUrl("/api/reviews");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let message = `Request to ${url} failed with status ${res.status}`;
    try {
      const data = (await res.json()) as { error?: string; errors?: Record<string, string> };
      if (data?.error) message = data.error;
      if (data?.errors) message = Object.values(data.errors)[0] ?? message;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  return res.json() as Promise<{ reviewId: string }>;
}

export async function voteHelpful(reviewId: string, voterKey: string) {
  const url = resolveUrl(`/api/reviews/${reviewId}/helpful`);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ voter_key: voterKey }),
  });

  if (!res.ok) {
    let message = `Request to ${url} failed with status ${res.status}`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) message = data.error;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  return res.json() as Promise<{ ok: boolean; counted: boolean; helpful_count: number }>;
}

async function adminFetchJson<T>(path: string, init?: RequestInit) {
  const url = resolveUrl(path);
  const headers = new Headers(init?.headers ?? {});
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, { ...init, headers, credentials: "include" });

  if (!res.ok) {
    let message = `Request to ${url} failed with status ${res.status}`;
    try {
      const data = (await res.json()) as { error?: string; errors?: Record<string, string> };
      if (data?.error) message = data.error;
      if (data?.errors) {
        const first = Object.values(data.errors)[0];
        if (first) message = first;
      }
    } catch {
      // ignore parse errors
    }
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  return res.json() as Promise<T>;
}

async function adminFetchJsonWithErrors<T>(path: string, init?: RequestInit) {
  const url = resolveUrl(path);
  const headers = new Headers(init?.headers ?? {});
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, { ...init, headers, credentials: "include" });

  let data: { error?: string; errors?: Record<string, string> } | null = null;
  try {
    data = (await res.json()) as { error?: string; errors?: Record<string, string> };
  } catch {
    data = null;
  }

  if (!res.ok) {
    let message = `Request to ${url} failed with status ${res.status}`;
    if (data?.error) message = data.error;
    if (data?.errors) {
      const first = Object.values(data.errors)[0];
      if (first) message = first;
    }
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  if (data?.error) {
    const err = new Error(data.error) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  return data as T;
}

export async function getAdminProducts() {
  return adminFetchJson<AdminProduct[]>("/api/admin/products", { cache: "no-store" });
}

export async function getAdminProduct(id: string) {
  return adminFetchJson<AdminProduct>(`/api/admin/products/${id}`, {
    cache: "no-store",
  });
}

export async function createAdminProduct(payload: AdminProductPayload) {
  return adminFetchJson<{ productId: string }>("/api/admin/products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminProduct(
  id: string,
  payload: AdminProductPayload
) {
  return adminFetchJson<{ ok: true }>(`/api/admin/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminProduct(id: string) {
  return adminFetchJson<{ ok: true }>(`/api/admin/products/${id}`, {
    method: "DELETE",
  });
}

export async function duplicateAdminProduct(id: string) {
  return adminFetchJson<{ productId: string }>(`/api/admin/products/${id}/duplicate`, {
    method: "POST",
  });
}

export async function getAdminOrders(params?: {
  status?: AdminOrder["status"];
  q?: string;
  sort?: "newest" | "oldest";
  limit?: number;
  cursor?: string | null;
}) {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.q) search.set("q", params.q);
  if (params?.sort) search.set("sort", params.sort);
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.cursor) search.set("cursor", params.cursor);
  const query = search.toString();
  const path = query ? `/api/admin/orders?${query}` : "/api/admin/orders";
  return adminFetchJson<AdminOrdersResponse>(path, { cache: "no-store" });
}

export async function getAdminOrder(id: string) {
  return adminFetchJson<{
    order: AdminOrderDetail;
    items: AdminOrderItem[];
    shipment?: AdminShipment | null;
  }>(
    `/api/admin/orders/${id}`,
    { cache: "no-store" }
  );
}

export async function updateAdminOrder(
  id: string,
  payload: { status?: AdminOrder["status"]; tracking_number?: string | null; admin_notes?: string | null }
) {
  return adminFetchJson<{ order: AdminOrderDetail }>(`/api/admin/orders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function getAdminOrderShipping(id: string) {
  return adminFetchJsonWithErrors<AdminShippingResponse>(`/api/admin/orders/${id}/shipping`, {
    cache: "no-store",
  });
}

export async function createAdminOrderShippingDraft(
  id: string,
  payload: { parcel: AdminShipmentParcel; parcel_template_id?: string | null }
) {
  return adminFetchJsonWithErrors<{ shipment: AdminShipment | null; rates: AdminShipmentRate[] }>(
    `/api/admin/orders/${id}/shipping/draft`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function buyAdminOrderShippingLabel(
  id: string,
  payload: { rate_id: string; label_format?: string }
) {
  return adminFetchJsonWithErrors<{
    shipment: AdminShipment | null;
    label_error?: string;
    label_error_code?: string;
  }>(
    `/api/admin/orders/${id}/shipping/buy`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function archiveAdminOrderLabel(orderId: string) {
  return adminFetchJsonWithErrors<{
    shipment: AdminShipment | null;
    label_url: string;
    archived?: boolean;
  }>(`/api/admin/orders/${orderId}/shipping/label`, {
    method: "POST",
  });
}

export async function getAdminPromoCodes() {
  return adminFetchJson<AdminPromoCode[]>("/api/admin/promo-codes", { cache: "no-store" });
}

export async function getAdminPromoCode(id: string) {
  return adminFetchJson<AdminPromoCode>(`/api/admin/promo-codes/${id}`, { cache: "no-store" });
}

export async function createAdminPromoCode(payload: Partial<AdminPromoCode> & { code: string }) {
  return adminFetchJson<AdminPromoCode>("/api/admin/promo-codes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminPromoCode(
  id: string,
  payload: Partial<AdminPromoCode> & { code?: string }
) {
  return adminFetchJson<AdminPromoCode>(`/api/admin/promo-codes/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
