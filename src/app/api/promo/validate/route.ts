import { NextResponse } from "next/server";

import { validatePromoCode } from "@/lib/promo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Body = {
  code?: string;
  subtotal_cents?: number;
  currency?: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ valid: false, reason: "invalid_json" }, { status: 400 });
  }

  const code = body.code?.toString() ?? "";
  const subtotalCents = Number(body.subtotal_cents) || 0;
  const currency = body.currency?.toString() ?? "usd";

  const result = await validatePromoCode({
    code,
    subtotal_cents: subtotalCents,
    currency,
  });

  if (!result.valid) {
    return NextResponse.json(result, { status: 200 });
  }

  if (!result.stripe_coupon_id) {
    return NextResponse.json(
      { valid: false, normalized_code: result.normalized_code, reason: "no_stripe_coupon" },
      { status: 200 }
    );
  }

  return NextResponse.json(result, { status: 200 });
}

