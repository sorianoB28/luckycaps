import { NextResponse } from "next/server";
import Stripe from "stripe";

import sql from "@/lib/db";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe =
  stripeSecret && stripeSecret.trim()
    ? new Stripe(stripeSecret, { apiVersion: "2024-04-10" })
    : null;
const isE2EMode = process.env.E2E_MODE?.toLowerCase() === "true";
const isNonProduction = process.env.NODE_ENV !== "production";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stripeSessionId = searchParams.get("session_id")?.trim() ?? "";
  if (!stripeSessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  if ((isE2EMode || isNonProduction) && /^cs_test_E2E_SUCCESS_/i.test(stripeSessionId)) {
    try {
      const seededRows = (await sql`
        SELECT id
        FROM public.orders
        WHERE stripe_checkout_session_id = ${stripeSessionId}
        LIMIT 1
      `) as Array<{ id: string }>;

      const seededOrderId = seededRows[0]?.id;
      if (!seededOrderId) {
        return NextResponse.json({ error: "Unknown test checkout session" }, { status: 400 });
      }

      return NextResponse.json({ orderId: seededOrderId, e2eMode: true });
    } catch (err) {
      console.error("Checkout finalize E2E lookup failed", err);
      return NextResponse.json({ error: "Unable to finalize checkout" }, { status: 500 });
    }
  }

  if (!stripe) {
    return NextResponse.json({ error: "Payments unavailable" }, { status: 500 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(stripeSessionId);
    const paymentStatus = session.payment_status;
    if (paymentStatus !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
    }

    const rows = (await sql`
      SELECT id
      FROM public.orders
      WHERE stripe_checkout_session_id = ${session.id}
      LIMIT 1
    `) as Array<{ id: string }>;

    const orderId = rows[0]?.id;
    if (!orderId) {
      return NextResponse.json({ pending: true }, { status: 202 });
    }

    return NextResponse.json({ orderId });
  } catch (err) {
    console.error("Checkout finalize failed", err);
    return NextResponse.json({ error: "Unable to finalize checkout" }, { status: 500 });
  }
}
