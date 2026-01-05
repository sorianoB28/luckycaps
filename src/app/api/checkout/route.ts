import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "next-auth/next";

import sql from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { buildCloudinaryCardUrl } from "@/lib/cloudinaryUrl";
import {
  attachStripeSessionToCheckout,
  ensureCheckoutSessionsTable,
} from "@/lib/checkoutSessions";
import { computeCheckoutQuote } from "@/lib/checkoutQuote";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe =
  stripeSecret && stripeSecret.trim()
    ? new Stripe(stripeSecret, { apiVersion: "2024-04-10" })
    : null;

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
  deliveryOption: string;
  promoCode?: string | null;
  notes?: string | null;
  items: CheckoutItemInput[];
};

const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const isUuid = (value: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    value
  );

export async function POST(request: Request) {
  const authSession = await getServerSession(authOptions);
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

  if (!stripe) {
    return NextResponse.json({ error: "Payments unavailable" }, { status: 500 });
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
    const quoteResult = await computeCheckoutQuote({
      items: itemInputs,
      deliveryOption: body.deliveryOption,
      promoCode: body.promoCode,
      currency: "usd",
    });

    if (!quoteResult.ok) {
      return NextResponse.json({ error: quoteResult.error }, { status: 400 });
    }

    const quote = quoteResult.quote;
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

    const origin = new URL(request.url).origin;
    const defaultSuccessUrl = `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const rawSuccessUrl = process.env.STRIPE_SUCCESS_URL;
    const successUrl =
      rawSuccessUrl && rawSuccessUrl.includes("{CHECKOUT_SESSION_ID}")
        ? rawSuccessUrl
        : defaultSuccessUrl;

    const defaultCancelUrl = `${origin}/checkout?canceled=1`;
    const rawCancelUrl = process.env.STRIPE_CANCEL_URL;
    const cancelUrl = rawCancelUrl && rawCancelUrl.includes("{ORDER_ID}") ? defaultCancelUrl : rawCancelUrl || defaultCancelUrl;

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = orderItems.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: "usd",
        unit_amount: item.price_cents,
        product_data: {
          name: item.name,
          images: item.image_url ? [buildCloudinaryCardUrl(item.image_url)] : undefined,
          metadata: {
            product_slug: item.product_slug,
            size: item.size ?? "",
            variant: item.variant ?? "",
          },
        },
      },
    }));

    if (quote.shipping_cents > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: quote.shipping_cents,
          product_data: {
            name: quote.delivery_option === "express" ? "Express shipping" : "Shipping",
            metadata: { delivery_option: quote.delivery_option, item_type: "shipping" },
          },
        },
      });
    }

    const stripeSession = await stripe.checkout.sessions.create({
      mode: "payment",
      metadata: {
        checkout_id: checkoutId,
        user_id: sessionUserId ?? "",
        expected_total_cents: String(quote.total_cents),
      },
      discounts: appliedPromo ? [{ coupon: appliedPromo.stripe_coupon_id }] : undefined,
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

    return NextResponse.json({ url: stripeSession.url });
  } catch (err) {
    console.error("Checkout error", err);
    return NextResponse.json({ error: "Unable to process order" }, { status: 500 });
  }
}
