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

export async function GET() {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

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
      ORDER BY created_at DESC
    `) as unknown as PromoCodeRow[];

    return NextResponse.json(rows);
  } catch (err) {
    console.error("Admin promo codes fetch failed", err);
    return NextResponse.json({ error: "Unable to load promo codes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    if (!stripe) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }

    let body: UpsertBody;
    try {
      body = (await request.json()) as UpsertBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const code = normalizeCode(body.code ?? "");
    if (!code) return NextResponse.json({ error: "Code is required" }, { status: 400 });

    const discountType = body.discount_type;
    if (discountType !== "percent" && discountType !== "amount") {
      return NextResponse.json({ error: "Invalid discount type" }, { status: 400 });
    }

    const currency = (body.currency ?? "usd").toString().toLowerCase();
    const active = body.active ?? true;
    const percentOff = body.percent_off != null ? Number(body.percent_off) : null;
    const amountOffCents =
      body.amount_off_cents != null ? Math.floor(Number(body.amount_off_cents)) : null;

    if (discountType === "percent") {
      if (!percentOff || !Number.isFinite(percentOff) || percentOff <= 0 || percentOff > 100) {
        return NextResponse.json({ error: "percent_off must be between 0 and 100" }, { status: 400 });
      }
    } else {
      if (!amountOffCents || !Number.isFinite(amountOffCents) || amountOffCents <= 0) {
        return NextResponse.json({ error: "amount_off_cents must be positive" }, { status: 400 });
      }
    }

    const existing = (await sql`
      SELECT id FROM public.promo_codes WHERE lower(code) = lower(${code}) LIMIT 1
    `) as unknown as Array<{ id: string }>;
    if (existing.length) {
      return NextResponse.json({ error: "Code already exists" }, { status: 400 });
    }

    const coupon = await stripe.coupons.create({
      duration: "once",
      ...(discountType === "percent"
        ? { percent_off: percentOff! }
        : { amount_off: amountOffCents!, currency }),
      name: code,
      metadata: { promo_code: code },
    });

    const rows = (await sql`
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
        ${currency},
        ${body.min_subtotal_cents ?? null},
        ${body.max_redemptions ?? null},
        0,
        ${body.starts_at ?? null}::timestamptz,
        ${body.ends_at ?? null}::timestamptz,
        ${coupon.id}
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
    `) as unknown as PromoCodeRow[];

    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    console.error("Admin promo code create failed", err);
    return NextResponse.json({ error: "Unable to create promo code" }, { status: 500 });
  }
}
