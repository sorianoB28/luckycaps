import { NextResponse } from "next/server";
import type Stripe from "stripe";

import {
  attachStripeSessionToCheckout,
  finalizeCheckoutByStripeSession,
  hasStripeWebhookEventBeenProcessed,
  markStripeWebhookEventProcessed,
  recordCheckoutTotalMismatch,
} from "@/lib/checkoutSessions";
import { getStripeServer, getStripeWebhookSecret } from "@/lib/stripeConfig";
const isDev = process.env.NODE_ENV !== "production";

const logDev = (message: string, meta?: Record<string, unknown>) => {
  if (!isDev) return;
  if (meta) {
    console.info(message, meta);
  } else {
    console.info(message);
  }
};

const PROCESSABLE_EVENT_TYPES = new Set<string>(["checkout.session.completed"]);

const logWebhookEvent = (payload: {
  id: string;
  type: string;
  processed: boolean;
  reasonSkipped?: string;
  orderId?: string | null;
}) => {
  if (!isDev) return;
  logDev(`[stripe-webhook] ${JSON.stringify(payload)}`);
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let stripe: ReturnType<typeof getStripeServer>;
  let webhookSecret: string;
  try {
    stripe = getStripeServer();
    webhookSecret = getStripeWebhookSecret();
  } catch (err) {
    console.error("Stripe webhook config invalid", err);
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  const rawBody = await request.text();
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (!PROCESSABLE_EVENT_TYPES.has(event.type)) {
    logWebhookEvent({
      id: event.id,
      type: event.type,
      processed: false,
      reasonSkipped: "ignored_event_type",
    });
    return NextResponse.json({ received: true, skipped: true });
  }

  try {
    const session = event.data.object as Stripe.Checkout.Session;
    const checkoutId = session.metadata?.checkout_id;
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

    if (await hasStripeWebhookEventBeenProcessed(event.id)) {
      logWebhookEvent({
        id: event.id,
        type: event.type,
        processed: false,
        reasonSkipped: "duplicate_event",
      });
      return NextResponse.json({ received: true, skipped: true });
    }

    if (checkoutId) {
      await attachStripeSessionToCheckout({
        checkoutId,
        stripeCheckoutSessionId: session.id,
      }).catch(() => {
        // ignore missing checkout row; finalize will handle
      });
    }

    const { orderId, emailAttempted, emailResult } = await finalizeCheckoutByStripeSession({
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
      logWebhookEvent({
        id: event.id,
        type: event.type,
        processed: false,
        reasonSkipped: "finalize_returned_no_order",
      });
      console.error("Stripe webhook: unable to finalize checkout session", {
        stripeCheckoutSessionId: session.id,
      });
      return NextResponse.json({ error: "Unable to finalize checkout" }, { status: 500 });
    }

    await markStripeWebhookEventProcessed({
      eventId: event.id,
      eventType: event.type,
      stripeCheckoutSessionId: session.id,
    });

    logWebhookEvent({
      id: event.id,
      type: event.type,
      processed: true,
      orderId,
    });

    if (emailAttempted && emailResult && !emailResult.ok) {
      logDev("Stripe webhook email send failed", {
        orderId,
        error: emailResult.error ?? "unknown error",
      });
    }
  } catch (err) {
    console.error("Stripe webhook handling failed", err);
    logWebhookEvent({
      id: event.id,
      type: event.type,
      processed: false,
      reasonSkipped: "handler_error",
    });
    return NextResponse.json({ error: "Webhook handling failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
