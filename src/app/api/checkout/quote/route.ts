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

function shouldForceQuoteFailure(request: Request) {
  if (process.env.NODE_ENV === "production") return false;

  const url = new URL(request.url);
  const failQuery = url.searchParams.get("e2e_fail")?.toLowerCase();
  const failHeader = request.headers.get("x-e2e-fail")?.toLowerCase();
  return failQuery === "checkout_quote" || failQuery === "quote" || failHeader === "checkout_quote";
}

export async function POST(request: Request) {
  if (shouldForceQuoteFailure(request)) {
    return NextResponse.json({ ok: false, error: "E2E forced quote failure" }, { status: 500 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? body.items : [];
  const deliveryOption = body.deliveryOption?.toString() ?? "flat";
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
