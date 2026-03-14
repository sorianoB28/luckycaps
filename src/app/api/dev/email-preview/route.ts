import { NextResponse } from "next/server";

import { blockDevRouteInProduction } from "@/lib/devRoutes";
import { buildEmailPreview } from "@/lib/email/resend";

// Examples:
// /api/dev/email-preview?type=order_confirmation&orderId=...
// /api/dev/email-preview?type=shipping_confirmation&orderId=...

export async function GET(request: Request) {
  const blockedResponse = blockDevRouteInProduction();
  if (blockedResponse) return blockedResponse;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const orderId = searchParams.get("orderId");
  const locale = searchParams.get("locale");

  if (!type || !orderId) {
    return NextResponse.json({ error: "Missing type or orderId" }, { status: 400 });
  }

  if (type !== "order_confirmation" && type !== "shipping_confirmation") {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const preview = await buildEmailPreview({
    orderId,
    eventType: type as "order_confirmation" | "shipping_confirmation",
    locale,
  });

  if (!preview) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return new NextResponse(preview.html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
