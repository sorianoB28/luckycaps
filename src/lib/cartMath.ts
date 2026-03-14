export const FLAT_SHIPPING_CENTS = 600;
export const TAX_RATE = 0.07;

export type PricedProduct = {
  price_cents: number;
  sale_price_cents: number | null;
  is_sale: boolean;
};

export type LineItemLike = {
  price_cents: number;
  quantity: number;
};

function normalizeCents(value: unknown): number {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, Math.floor(amount));
}

function normalizeQuantity(value: unknown): number {
  const quantity = Number(value);
  if (!Number.isFinite(quantity)) return 0;
  return Math.max(0, Math.floor(quantity));
}

export function shippingCentsForDelivery(_deliveryOption: string): number {
  return FLAT_SHIPPING_CENTS;
}

export function calcTaxCents(taxableCents: number): number {
  const taxable = normalizeCents(taxableCents);
  return Math.max(0, Math.round(taxable * TAX_RATE));
}

export function getEffectivePriceCents(product: PricedProduct): number {
  const basePrice = normalizeCents(product.price_cents);
  const salePrice =
    product.sale_price_cents == null ? null : normalizeCents(product.sale_price_cents);

  if (product.is_sale && salePrice != null) {
    return salePrice;
  }

  return basePrice;
}

export function calculateSubtotalCents(items: LineItemLike[]): number {
  return (items ?? []).reduce((sum, item) => {
    const price = normalizeCents(item?.price_cents);
    const quantity = normalizeQuantity(item?.quantity);
    return sum + price * quantity;
  }, 0);
}

export function calculateTotalCents(params: {
  subtotal_cents: number;
  discount_cents?: number;
  shipping_cents?: number;
  tax_cents?: number;
}): number {
  const subtotal = normalizeCents(params.subtotal_cents);
  const discount = normalizeCents(params.discount_cents ?? 0);
  const shipping = normalizeCents(params.shipping_cents ?? 0);
  const tax = normalizeCents(params.tax_cents ?? 0);

  return Math.max(0, subtotal - discount + shipping + tax);
}
