import { NextResponse } from "next/server";
import Stripe from "stripe";

import { requireAdmin } from "@/lib/adminAuth";
import sql from "@/lib/adminDb";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe =
  stripeSecret && stripeSecret.trim()
    ? new Stripe(stripeSecret, { apiVersion: "2024-04-10" })
    : null;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PromoCodeRow = {
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

type UpsertBody = {
  code?: string;
  active?: boolean;
  discount_type?: "percent" | "amount";
  percent_off?: number | null;
  amount_off_cents?: number | null;
  currency?: string | null;
  min_subtotal_cents?: number | null;
  max_redemptions?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
};

const normalizeCode = (code: string) => code.trim().toUpperCase();

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    const id = params.id;
    if (!uuidPattern.test(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

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
        stripe_coupon_id,
        created_at,
        updated_at
      FROM public.promo_codes
      WHERE id = ${id}::uuid
      LIMIT 1
    `) as unknown as PromoCodeRow[];

    const promo = rows[0];
    if (!promo) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(promo);
  } catch (err) {
    console.error("Admin promo code fetch failed", err);
    return NextResponse.json({ error: "Unable to load promo code" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    if (!stripe) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }

    const id = params.id;
    if (!uuidPattern.test(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    let body: UpsertBody;
    try {
      body = (await request.json()) as UpsertBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const currentRows = (await sql`
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
        stripe_coupon_id,
        created_at,
        updated_at
      FROM public.promo_codes
      WHERE id = ${id}::uuid
      LIMIT 1
    `) as unknown as PromoCodeRow[];

    const current = currentRows[0];
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const nextCode = body.code != null ? normalizeCode(body.code) : current.code;
    if (!nextCode) return NextResponse.json({ error: "Code is required" }, { status: 400 });

    if (body.code != null && nextCode.toLowerCase() !== current.code.toLowerCase()) {
      const dup = (await sql`
        SELECT id FROM public.promo_codes WHERE lower(code) = lower(${nextCode}) AND id <> ${id}::uuid LIMIT 1
      `) as unknown as Array<{ id: string }>;
      if (dup.length) return NextResponse.json({ error: "Code already exists" }, { status: 400 });
    }

    const nextDiscountType = body.discount_type ?? current.discount_type;
    const nextCurrency = (body.currency ?? current.currency ?? "usd").toString().toLowerCase();
    const nextPercentOff = body.percent_off != null ? Number(body.percent_off) : current.percent_off;
    const nextAmountOffCents =
      body.amount_off_cents != null ? Math.floor(Number(body.amount_off_cents)) : current.amount_off_cents;

    if (nextDiscountType === "percent") {
      if (!nextPercentOff || !Number.isFinite(nextPercentOff) || nextPercentOff <= 0 || nextPercentOff > 100) {
        return NextResponse.json({ error: "percent_off must be between 0 and 100" }, { status: 400 });
      }
    } else {
      if (!nextAmountOffCents || !Number.isFinite(nextAmountOffCents) || nextAmountOffCents <= 0) {
        return NextResponse.json({ error: "amount_off_cents must be positive" }, { status: 400 });
      }
    }

    const discountChanged =
      nextDiscountType !== current.discount_type ||
      (nextDiscountType === "percent"
        ? nextPercentOff !== current.percent_off
        : nextAmountOffCents !== current.amount_off_cents) ||
      nextCurrency !== (current.currency ?? "usd").toLowerCase();

    let nextStripeCouponId = current.stripe_coupon_id;
    if (!nextStripeCouponId || discountChanged) {
      const coupon = await stripe.coupons.create({
        duration: "once",
        ...(nextDiscountType === "percent"
          ? { percent_off: nextPercentOff! }
          : { amount_off: nextAmountOffCents!, currency: nextCurrency }),
        name: nextCode,
        metadata: { promo_code: nextCode },
      });
      nextStripeCouponId = coupon.id;
    }

    const rows = (await sql`
      UPDATE public.promo_codes
      SET
        code = ${nextCode},
        active = ${body.active ?? current.active},
        discount_type = ${nextDiscountType},
        percent_off = ${nextPercentOff},
        amount_off_cents = ${nextAmountOffCents},
        currency = ${nextCurrency},
        min_subtotal_cents = ${body.min_subtotal_cents ?? current.min_subtotal_cents},
        max_redemptions = ${body.max_redemptions ?? current.max_redemptions},
        starts_at = ${body.starts_at ?? current.starts_at}::timestamptz,
        ends_at = ${body.ends_at ?? current.ends_at}::timestamptz,
        stripe_coupon_id = ${nextStripeCouponId},
        updated_at = now()
      WHERE id = ${id}::uuid
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
    `) as unknown as PromoCodeRow[];

    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error("Admin promo code update failed", err);
    return NextResponse.json({ error: "Unable to update promo code" }, { status: 500 });
  }
}

