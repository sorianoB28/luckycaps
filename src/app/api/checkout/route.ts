import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import type Stripe from "stripe";

import sql from "@/lib/db";
import { authOptions } from "@/lib/auth";
import {
  attachStripeSessionToCheckout,
  ensureCheckoutSessionsTable,
} from "@/lib/checkoutSessions";
import { computeCheckoutQuote } from "@/lib/checkoutQuote";
import { setSentryUserFromSession } from "@/lib/sentryUser";
import { getStripeServer, resolveStripeCheckoutUrls } from "@/lib/stripeConfig";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type CheckoutItemInput = {
  productId: string;
  quantity: number;
  size?: string | null;
  variant?: string | null;
};

type CheckoutRequestBody = {
  contact: { email: string; phone?: string | null };
  shippingAddress: {
    firstName: string;
    lastName: string;
    address1: string;
    address2?: string | null;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  deliveryOption?: string | null;
  shippingOption?: string | null;
  promoCode?: string | null;
  notes?: string | null;
  items: CheckoutItemInput[];
};

const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const isE2EMode = process.env.E2E_MODE?.toLowerCase() === "true";

const isUuid = (value: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    value
  );

export async function POST(request: Request) {
  const authSession = await getServerSession(authOptions);
  setSentryUserFromSession(authSession);
  const sessionUserId =
    authSession?.user?.id && isUuid(authSession.user.id)
      ? authSession.user.id
      : null;

  let body: CheckoutRequestBody;
  try {
    body = (await request.json()) as CheckoutRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const errors: string[] = [];
  if (!body.contact?.email || !emailRegex.test(body.contact.email.trim())) {
    errors.push("Valid contact email is required.");
  }
  const shipping = body.shippingAddress;
  const requiredShipping = [
    shipping?.firstName,
    shipping?.lastName,
    shipping?.address1,
    shipping?.city,
    shipping?.state,
    shipping?.zip,
    shipping?.country,
  ];
  if (requiredShipping.some((v) => !v || !v.toString().trim())) {
    errors.push("All shipping fields are required.");
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    errors.push("At least one item is required.");
  }
  const shippingOptionRaw = body.shippingOption ?? body.deliveryOption ?? null;
  const shippingOption =
    typeof shippingOptionRaw === "string" && shippingOptionRaw.trim().length > 0
      ? shippingOptionRaw.trim()
      : null;
  if (!shippingOption) {
    errors.push("Please select a shipping option.");
  }
  if (errors.length) {
    return NextResponse.json({ error: errors[0] }, { status: 400 });
  }

  const itemInputs = body.items.map((item) => ({
    ...item,
    productId: item.productId?.trim?.() ?? "",
    size: item.size?.trim?.() ?? null,
    variant: item.variant?.trim?.() ?? null,
    quantity: Number(item.quantity),
  }));

  if (itemInputs.some((i) => !i.productId || !isUuid(i.productId))) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }
  if (itemInputs.some((i) => !Number.isInteger(i.quantity) || i.quantity < 1)) {
    return NextResponse.json({ error: "Quantity must be at least 1" }, { status: 400 });
  }

  try {
    const stripe = getStripeServer();
    const quoteResult = await computeCheckoutQuote({
      items: itemInputs,
      shippingOption,
      promoCode: body.promoCode,
      currency: "usd",
    });

    if (!quoteResult.ok) {
      return NextResponse.json({ error: quoteResult.error }, { status: 400 });
    }

    const quote = quoteResult.quote;
    if (
      quote.shipping_status !== "selected" ||
      quote.total_status !== "ready" ||
      quote.shipping_cents == null ||
      quote.total_cents == null
    ) {
      return NextResponse.json(
        { error: "Shipping must be selected before checkout." },
        { status: 400 }
      );
    }
    if (quote.total_cents <= 0) {
      return NextResponse.json(
        { error: "Order total must be greater than $0.00." },
        { status: 400 }
      );
    }
    const orderItems = quote.items;

    const appliedPromo = quote.promo
      ? {
          promo_code_id: quote.promo.promo_code_id,
          normalized_code: quote.promo.normalized_code,
          stripe_coupon_id: quote.promo.stripe_coupon_id,
          discount_cents: quote.discount_cents,
        }
      : null;

    const contactJson = JSON.stringify({
      email: body.contact.email.trim(),
      phone: body.contact.phone?.trim?.() || null,
      notes: body.notes?.trim?.() || null,
    });
    const shippingJson = JSON.stringify({
      firstName: shipping!.firstName.trim(),
      lastName: shipping!.lastName.trim(),
      address1: shipping!.address1.trim(),
      address2: shipping!.address2?.trim?.() || null,
      city: shipping!.city.trim(),
      state: shipping!.state.trim(),
      zip: shipping!.zip.trim(),
      country: shipping!.country.trim(),
    });

    const customerName =
      shipping!.firstName?.trim?.() || shipping!.lastName?.trim?.()
        ? `${shipping!.firstName.trim()} ${shipping!.lastName?.trim?.() || ""}`.trim()
        : null;

    const checkoutId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });

    await ensureCheckoutSessionsTable();
    if (!isUuid(checkoutId)) {
      throw new Error("Failed to create checkout session");
    }

    await sql`
      INSERT INTO public.checkout_sessions (
        id,
        stripe_checkout_session_id,
        user_id,
        email,
        customer_name,
        customer_phone,
        contact,
        shipping_address,
        delivery_option,
        promo_code,
        promo_code_id,
        discount_cents,
        subtotal_cents,
        shipping_cents,
        tax_cents,
        total_cents,
        currency,
        items
      )
      VALUES (
        ${checkoutId}::uuid,
        null,
        ${sessionUserId}::uuid,
        ${body.contact.email.trim()},
        ${customerName},
        ${body.contact.phone?.trim?.() || null},
        ${contactJson}::jsonb,
        ${shippingJson}::jsonb,
        ${quote.delivery_option},
        ${appliedPromo?.normalized_code ?? null},
        ${appliedPromo?.promo_code_id ?? null}::uuid,
        ${appliedPromo?.discount_cents ?? 0},
        ${quote.subtotal_cents},
        ${quote.shipping_cents},
        ${quote.tax_cents},
        ${quote.total_cents},
        'usd',
        ${JSON.stringify(orderItems)}::jsonb
      )
    `;

    const { successUrl, cancelUrl } = resolveStripeCheckoutUrls(request.url);

    const taxableSubtotalCents = Math.max(0, quote.subtotal_cents - quote.discount_cents);
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    if (taxableSubtotalCents > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: taxableSubtotalCents,
          product_data: {
            name:
              quote.discount_cents > 0
                ? "Items Subtotal (after discount)"
                : "Items Subtotal",
            metadata: { item_type: "items_subtotal" },
          },
        },
      });
    }

    if (quote.tax_cents > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: quote.tax_cents,
          product_data: {
            name: "Tax (7%)",
            metadata: { item_type: "tax" },
          },
        },
      });
    }

    if (quote.shipping_cents > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: quote.shipping_cents,
          product_data: {
            name: "Flat Rate Shipping",
            metadata: {
              delivery_option: quote.delivery_option ?? "flat",
              item_type: "shipping",
            },
          },
        },
      });
    }

    const lineItemsTotal = lineItems.reduce(
      (sum, item) => sum + (item.price_data?.unit_amount ?? 0) * (item.quantity ?? 1),
      0
    );
    console.log("checkout totals", {
      checkoutId,
      subtotal_cents: quote.subtotal_cents,
      discount_cents: quote.discount_cents,
      tax_cents: quote.tax_cents,
      shipping_cents: quote.shipping_cents,
      total_cents: quote.total_cents,
      line_items_total: lineItemsTotal,
    });

    const stripeSession = await stripe.checkout.sessions.create({
      mode: "payment",
      metadata: {
        checkout_id: checkoutId,
        user_id: sessionUserId ?? "",
        expected_total_cents: String(quote.total_cents),
        shipping_cents: String(quote.shipping_cents),
        tax_cents: String(quote.tax_cents),
      },
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    await attachStripeSessionToCheckout({
      checkoutId,
      stripeCheckoutSessionId: stripeSession.id,
    });

    if (!stripeSession.url) {
      throw new Error("Stripe session missing url");
    }

    if (isE2EMode) {
      return NextResponse.json({
        url: stripeSession.url,
        sessionUrl: stripeSession.url,
        checkoutSessionId: stripeSession.id,
        e2eMode: true,
      });
    }

    return NextResponse.json({ url: stripeSession.url });
  } catch (err) {
    console.error("Checkout error", err);
    return NextResponse.json({ error: "Unable to process order" }, { status: 500 });
  }
}
