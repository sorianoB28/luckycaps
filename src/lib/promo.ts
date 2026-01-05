import "server-only";

import sql from "@/lib/db";

export type PromoDiscountType = "percent" | "amount";

export type PromoValidationResult =
  | {
      valid: true;
      promo_code_id: string;
      normalized_code: string;
      stripe_coupon_id: string | null;
      discount_cents: number;
    }
  | {
      valid: false;
      normalized_code?: string;
      reason:
        | "missing_code"
        | "not_found"
        | "inactive"
        | "not_started"
        | "expired"
        | "min_subtotal"
        | "max_redemptions"
        | "invalid_discount"
        | "currency_mismatch";
      min_subtotal_cents?: number | null;
      max_redemptions?: number | null;
      times_redeemed?: number | null;
    };

type PromoRow = {
  id: string;
  code: string;
  active: boolean;
  discount_type: PromoDiscountType;
  percent_off: number | null;
  amount_off_cents: number | null;
  currency: string | null;
  min_subtotal_cents: number | null;
  max_redemptions: number | null;
  times_redeemed: number | null;
  starts_at: string | null;
  ends_at: string | null;
  stripe_coupon_id: string | null;
};

const normalizeCode = (code: string) => code.trim().toUpperCase();

const parseTimestamp = (value: string | null) => {
  if (!value) return null;
  const dt = new Date(value);
  return Number.isNaN(dt.valueOf()) ? null : dt;
};

export async function validatePromoCode(params: {
  code: string;
  subtotal_cents: number;
  currency?: string;
}): Promise<PromoValidationResult> {
  const rawCode = params.code ?? "";
  const code = normalizeCode(rawCode);
  const currency = (params.currency ?? "usd").toLowerCase();
  const subtotalCents = Math.max(0, Math.floor(Number(params.subtotal_cents) || 0));

  if (!code) return { valid: false, reason: "missing_code" };

  const rows = (await sql`
    SELECT
      id,
      code,
      active,
      discount_type,
      percent_off,
      amount_off_cents,
      currency,
      min_subtotal_cents,
      max_redemptions,
      times_redeemed,
      starts_at,
      ends_at,
      stripe_coupon_id
    FROM public.promo_codes
    WHERE lower(code) = lower(${code})
    LIMIT 1
  `) as unknown as PromoRow[];

  const promo = rows[0];
  if (!promo) return { valid: false, normalized_code: code, reason: "not_found" };
  if (!promo.active) return { valid: false, normalized_code: code, reason: "inactive" };

  if (promo.currency && promo.currency.toLowerCase() !== currency) {
    return { valid: false, normalized_code: code, reason: "currency_mismatch" };
  }

  const now = new Date();
  const startsAt = parseTimestamp(promo.starts_at);
  const endsAt = parseTimestamp(promo.ends_at);
  if (startsAt && now < startsAt) {
    return { valid: false, normalized_code: code, reason: "not_started" };
  }
  if (endsAt && now > endsAt) {
    return { valid: false, normalized_code: code, reason: "expired" };
  }

  if (promo.min_subtotal_cents != null && subtotalCents < promo.min_subtotal_cents) {
    return {
      valid: false,
      normalized_code: code,
      reason: "min_subtotal",
      min_subtotal_cents: promo.min_subtotal_cents,
    };
  }

  if (
    promo.max_redemptions != null &&
    promo.times_redeemed != null &&
    promo.times_redeemed >= promo.max_redemptions
  ) {
    return {
      valid: false,
      normalized_code: code,
      reason: "max_redemptions",
      max_redemptions: promo.max_redemptions,
      times_redeemed: promo.times_redeemed,
    };
  }

  let discountCents = 0;
  if (promo.discount_type === "percent") {
    const pct = Number(promo.percent_off ?? 0);
    if (!Number.isFinite(pct) || pct <= 0) {
      return { valid: false, normalized_code: code, reason: "invalid_discount" };
    }
    discountCents = Math.round((subtotalCents * pct) / 100);
  } else {
    const amount = Number(promo.amount_off_cents ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { valid: false, normalized_code: code, reason: "invalid_discount" };
    }
    discountCents = Math.floor(amount);
  }

  discountCents = Math.min(subtotalCents, Math.max(0, discountCents));

  return {
    valid: true,
    promo_code_id: promo.id,
    normalized_code: normalizeCode(promo.code),
    stripe_coupon_id: promo.stripe_coupon_id,
    discount_cents: discountCents,
  };
}

