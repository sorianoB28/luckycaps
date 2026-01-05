import "server-only";

import sql from "@/lib/db";
import { normalizeSize, sortSizes } from "@/lib/sizeOptions";
import { validatePromoCode } from "@/lib/promo";

export type QuoteItemInput = {
  productId: string;
  quantity: number;
  size?: string | null;
  variant?: string | null;
};

export type CheckoutQuote = {
  currency: "usd";
  delivery_option: string;
  subtotal_cents: number;
  discount_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  promo:
    | null
    | {
        promo_code_id: string;
        normalized_code: string;
        stripe_coupon_id: string;
      };
  items: Array<{
    product_id: string;
    product_slug: string;
    name: string;
    image_url: string | null;
    price_cents: number;
    quantity: number;
    variant: string | null;
    size: string | null;
  }>;
};

const isUuid = (value: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    value
  );

const shippingCentsForDelivery = (deliveryOption: string) => {
  if (deliveryOption === "express") return 1200;
  return 0; // standard/default
};

export async function computeCheckoutQuote(params: {
  items: QuoteItemInput[];
  deliveryOption: string;
  promoCode?: string | null;
  currency?: string;
}) {
  const currency = (params.currency ?? "usd").toLowerCase();
  if (currency !== "usd") {
    return { ok: false as const, error: "Unsupported currency" };
  }

  const itemInputs = (params.items ?? []).map((item) => ({
    productId: item.productId?.trim?.() ?? "",
    quantity: Number(item.quantity),
    size: item.size?.trim?.() ?? null,
    variant: item.variant?.trim?.() ?? null,
  }));

  if (!itemInputs.length) return { ok: false as const, error: "No items" };
  if (itemInputs.some((i) => !i.productId || !isUuid(i.productId))) {
    return { ok: false as const, error: "Invalid product id" };
  }
  if (itemInputs.some((i) => !Number.isInteger(i.quantity) || i.quantity < 1)) {
    return { ok: false as const, error: "Invalid quantity" };
  }

  const productIds = itemInputs.map((i) => i.productId);
  const products = (await sql`
    SELECT
      p.id,
      p.slug,
      p.name,
      p.price_cents,
      p.sale_price_cents,
      p.original_price_cents,
      p.is_sale,
      p.stock,
      p.active,
      (
        SELECT url
        FROM public.product_images pi
        WHERE pi.product_id = p.id
        ORDER BY pi.sort_order ASC NULLS LAST, pi.created_at ASC
        LIMIT 1
      ) AS primary_image,
      COALESCE(
        (
          SELECT ARRAY_AGG(ps.name ORDER BY CASE LOWER(ps.name)
            WHEN 's/m' THEN 1
            WHEN 'm/l' THEN 2
            WHEN 'l/xl' THEN 3
            ELSE 100 END, ps.name ASC)
          FROM public.product_sizes ps
          WHERE ps.product_id = p.id
        ),
        '{}'::text[]
      ) AS sizes
    FROM public.products p
    WHERE p.id = ANY(${productIds}::uuid[])
  `) as Array<{
    id: string;
    slug: string;
    name: string;
    price_cents: number;
    sale_price_cents: number | null;
    original_price_cents: number | null;
    is_sale: boolean;
    stock: number;
    active: boolean;
    primary_image: string | null;
    sizes: string[];
  }>;

  const productMap = new Map(products.map((p) => [p.id, p]));
  for (const input of itemInputs) {
    const product = productMap.get(input.productId);
    if (!product || !product.active) {
      return { ok: false as const, error: "Product not available" };
    }
    const availableSizes = sortSizes(
      (product.sizes ?? [])
        .filter((s): s is NonNullable<typeof s> => s != null)
        .map((s) => normalizeSize(s))
        .filter((s): s is NonNullable<typeof s> => Boolean(s))
    );
    if (availableSizes.length) {
      const normalized = normalizeSize(input.size);
      if (!normalized || !availableSizes.includes(normalized)) {
        return { ok: false as const, error: `Size required for ${product.name}` };
      }
      input.size = normalized;
    } else {
      input.size = null;
    }
    if (product.stock < input.quantity) {
      return { ok: false as const, error: `Insufficient stock for ${product.name}` };
    }
  }

  const orderItems = itemInputs.map((input) => {
    const product = productMap.get(input.productId)!;
    const price =
      product.is_sale && product.sale_price_cents != null
        ? product.sale_price_cents
        : product.price_cents;
    return {
      product_id: product.id,
      product_slug: product.slug,
      name: product.name,
      image_url: product.primary_image,
      price_cents: price,
      quantity: input.quantity,
      variant: input.variant ?? null,
      size: input.size,
    };
  });

  const subtotalCents = orderItems.reduce(
    (sum, item) => sum + item.price_cents * item.quantity,
    0
  );

  const shippingCents = shippingCentsForDelivery(params.deliveryOption);
  const taxCents = 0; // tax disabled for now to match Stripe exactly
  const promoSubtotalCents = subtotalCents + shippingCents;

  let promo: CheckoutQuote["promo"] = null;
  let discountCents = 0;

  const requestedPromo = params.promoCode?.trim?.() || null;
  if (requestedPromo) {
    const promoResult = await validatePromoCode({
      code: requestedPromo,
      subtotal_cents: promoSubtotalCents,
      currency: "usd",
    });

    if (!promoResult.valid) {
      return { ok: false as const, promoError: promoResult, error: "Invalid promo code" };
    }

    if (!promoResult.stripe_coupon_id) {
      return {
        ok: false as const,
        promoError: { valid: false as const, reason: "no_stripe_coupon", normalized_code: promoResult.normalized_code },
        error: "Promo code not available",
      };
    }

    promo = {
      promo_code_id: promoResult.promo_code_id,
      normalized_code: promoResult.normalized_code,
      stripe_coupon_id: promoResult.stripe_coupon_id,
    };
    discountCents = promoResult.discount_cents;
  }

  const totalCents = Math.max(0, subtotalCents - discountCents + shippingCents + taxCents);

  const quote: CheckoutQuote = {
    currency: "usd",
    delivery_option: params.deliveryOption,
    subtotal_cents: subtotalCents,
    discount_cents: discountCents,
    shipping_cents: shippingCents,
    tax_cents: taxCents,
    total_cents: totalCents,
    promo,
    items: orderItems,
  };

  return { ok: true as const, quote };
}
