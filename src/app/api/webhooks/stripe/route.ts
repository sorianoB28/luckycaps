import { NextResponse } from "next/server";
import Stripe from "stripe";

import {
  attachStripeSessionToCheckout,
  finalizeCheckoutByStripeSession,
  recordCheckoutTotalMismatch,
} from "@/lib/checkoutSessions";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const stripe =
  stripeSecret && stripeSecret.trim()
    ? new Stripe(stripeSecret, { apiVersion: "2024-04-10" })
    : null;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  const rawBody = await request.text();
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const checkoutId = session.metadata?.checkout_id;
      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null;

      if (checkoutId) {
        await attachStripeSessionToCheckout({
          checkoutId,
          stripeCheckoutSessionId: session.id,
        }).catch(() => {
          // ignore missing checkout row; finalize will handle
        });
      }

      const { orderId } = await finalizeCheckoutByStripeSession({
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: paymentIntentId,
      });

      const amountTotal =
        typeof session.amount_total === "number" ? session.amount_total : null;
      const currency = typeof session.currency === "string" ? session.currency : null;
      const check = await recordCheckoutTotalMismatch({
        stripeCheckoutSessionId: session.id,
        stripeAmountTotalCents: amountTotal,
        stripeCurrency: currency,
      });
      if (check.ok && check.mismatch) {
        console.error("Stripe webhook: total mismatch", {
          stripeCheckoutSessionId: session.id,
          expected_total_cents: check.expected_total_cents,
          stripe_amount_total_cents: check.stripe_amount_total_cents,
        });
      }

      if (!orderId) {
        console.error("Stripe webhook: unable to finalize checkout session", {
          stripeCheckoutSessionId: session.id,
        });
        return NextResponse.json({ error: "Unable to finalize checkout" }, { status: 500 });
      }
    }
  } catch (err) {
    console.error("Stripe webhook handling failed", err);
    return NextResponse.json({ error: "Webhook handling failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
