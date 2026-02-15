import { NextResponse } from "next/server";

import sql from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SeedPromoBody = {
  code?: string;
  type?: "percent" | "amount";
  value?: number;
  valueCents?: number;
  active?: boolean;
  minSubtotalCents?: number;
  startsAt?: string | null;
  endsAt?: string | null;
  maxRedemptions?: number | null;
  timesRedeemed?: number | null;
};

type PromoRow = {
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

const normalizeCode = (value: string) => value.trim().toUpperCase();

const parseDateValue = (raw: string | null | undefined) => {
  if (raw == null || raw === "") return null;
  const dt = new Date(raw);
  if (Number.isNaN(dt.valueOf())) return null;
  return dt.toISOString();
};

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }

  let body: SeedPromoBody;
  try {
    body = (await request.json()) as SeedPromoBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const code = normalizeCode(body.code ?? "");
  if (!code) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }

  const discountType = body.type;
  if (discountType !== "percent" && discountType !== "amount") {
    return NextResponse.json({ error: "type must be percent or amount" }, { status: 400 });
  }

  const rawValue = Number(body.value);
  const rawValueCents = Number(body.valueCents);
  const hasValue = Number.isFinite(rawValue) && rawValue > 0;
  const hasValueCents = Number.isFinite(rawValueCents) && rawValueCents > 0;
  if (discountType === "percent" && !hasValue) {
    return NextResponse.json({ error: "value must be a positive number for percent promos" }, { status: 400 });
  }
  if (discountType === "amount" && !hasValue && !hasValueCents) {
    return NextResponse.json(
      { error: "value (dollars) or valueCents must be provided for amount promos" },
      { status: 400 }
    );
  }

  const active = body.active ?? true;
  const minSubtotalCents = Math.max(0, Math.floor(Number(body.minSubtotalCents ?? 0) || 0));
  const startsAt = parseDateValue(body.startsAt) ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const endsAt = parseDateValue(body.endsAt);
  const maxRedemptionsRaw = Number(body.maxRedemptions);
  const maxRedemptions =
    Number.isFinite(maxRedemptionsRaw) && maxRedemptionsRaw > 0
      ? Math.floor(maxRedemptionsRaw)
      : null;
  const timesRedeemedRaw = Number(body.timesRedeemed);
  const timesRedeemed =
    Number.isFinite(timesRedeemedRaw) && timesRedeemedRaw >= 0
      ? Math.floor(timesRedeemedRaw)
      : 0;
  const percentOff = discountType === "percent" ? rawValue : null;
  const amountOffCents =
    discountType === "amount"
      ? hasValueCents
        ? Math.round(rawValueCents)
        : Math.round(rawValue * 100)
      : null;

  if (percentOff != null && (percentOff <= 0 || percentOff > 100)) {
    return NextResponse.json({ error: "percent value must be between 0 and 100" }, { status: 400 });
  }

  if (amountOffCents != null && amountOffCents <= 0) {
    return NextResponse.json({ error: "amount value must be greater than 0" }, { status: 400 });
  }

  // Checkout quote requires a non-null stripe_coupon_id; dev seed uses a deterministic placeholder.
  const stripeCouponId = `dev_seed_${code.toLowerCase()}`;

  try {
    const existing = (await sql`
      SELECT id
      FROM public.promo_codes
      WHERE lower(code) = lower(${code})
      LIMIT 1
    `) as unknown as Array<{ id: string }>;

    let rows: PromoRow[];
    if (existing[0]?.id) {
      rows = (await sql`
        UPDATE public.promo_codes
        SET
          code = ${code},
          active = ${active},
          discount_type = ${discountType},
          percent_off = ${percentOff},
          amount_off_cents = ${amountOffCents},
          currency = 'usd',
          min_subtotal_cents = ${minSubtotalCents},
          max_redemptions = ${maxRedemptions},
          times_redeemed = ${timesRedeemed},
          starts_at = ${startsAt}::timestamptz,
          ends_at = ${endsAt}::timestamptz,
          stripe_coupon_id = ${stripeCouponId},
          updated_at = now()
        WHERE id = ${existing[0].id}::uuid
        RETURNING
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
          stripe_coupon_id,
          created_at,
          updated_at
      `) as unknown as PromoRow[];
    } else {
      rows = (await sql`
        INSERT INTO public.promo_codes (
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
        )
        VALUES (
          ${code},
          ${active},
          ${discountType},
          ${percentOff},
          ${amountOffCents},
          'usd',
          ${minSubtotalCents},
          ${maxRedemptions},
          ${timesRedeemed},
          ${startsAt}::timestamptz,
          ${endsAt}::timestamptz,
          ${stripeCouponId}
        )
        RETURNING
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
          stripe_coupon_id,
          created_at,
          updated_at
      `) as unknown as PromoRow[];
    }

    const promo = rows[0];
    if (promo) {
      console.info("[seed-promo] upserted promo", {
        code: promo.code,
        discount_type: promo.discount_type,
        percent_off: promo.percent_off,
        amount_off_cents: promo.amount_off_cents,
        active: promo.active,
        starts_at: promo.starts_at,
        ends_at: promo.ends_at,
        min_subtotal_cents: promo.min_subtotal_cents,
        max_redemptions: promo.max_redemptions,
        stripe_coupon_id: promo.stripe_coupon_id,
      });
    }
    return NextResponse.json({ ok: true, promo }, { status: 200 });
  } catch (err) {
    console.error("seed-promo error", err);
    return NextResponse.json({ error: "Unable to seed promo code" }, { status: 500 });
  }
}
