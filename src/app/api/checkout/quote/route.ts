import { NextResponse } from "next/server";

import { computeCheckoutQuote, type QuoteItemInput } from "@/lib/checkoutQuote";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Body = {
  items?: QuoteItemInput[];
  deliveryOption?: string;
  promoCode?: string | null;
  currency?: string;
  shippingAddress?: Record<string, unknown> | null;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? body.items : [];
  const deliveryOption = body.deliveryOption?.toString() ?? "standard";
  const promoCode = body.promoCode?.toString() ?? null;
  const currency = body.currency?.toString() ?? "usd";

  const result = await computeCheckoutQuote({
    items,
    deliveryOption,
    promoCode,
    currency,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, promoError: (result as any).promoError ?? null },
      { status: 200 }
    );
  }

  return NextResponse.json({ ok: true, quote: result.quote }, { status: 200 });
}

