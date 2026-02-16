import { NextResponse } from "next/server";

import { validatePromoCode } from "@/lib/promo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Body = {
  code?: string;
  subtotal_cents?: number;
  currency?: string;
};

const methodNotAllowed = () =>
  NextResponse.json({ valid: false, error: "method_not_allowed" }, { status: 405 });

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { valid: false, error: "invalid_json", reason: "invalid_json" },
      { status: 400 }
    );
  }

  const code = body.code?.toString() ?? "";
  if (!code.trim()) {
    return NextResponse.json(
      { valid: false, error: "code_required", reason: "missing_code" },
      { status: 400 }
    );
  }

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

export async function GET() {
  return methodNotAllowed();
}

export async function PUT() {
  return methodNotAllowed();
}

export async function PATCH() {
  return methodNotAllowed();
}

export async function DELETE() {
  return methodNotAllowed();
}
