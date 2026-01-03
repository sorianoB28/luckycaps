import { NextResponse } from "next/server";
import Stripe from "stripe";

import sql from "@/lib/db";
import { buildCloudinaryCardUrl } from "@/lib/cloudinaryUrl";
import { normalizeSize, sortSizes } from "@/lib/sizeOptions";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe =
  stripeSecret && stripeSecret.trim()
    ? new Stripe(stripeSecret, { apiVersion: "2024-06-20" })
    : null;

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
    const productIds = itemInputs.map((i) => i.productId);
    const products = (await sql`
      SELECT
        p.id,
        p.slug,
        p.name,
        p.price_cents,
        p.sale_price_cents,
        p.original_price_cents,
        p.is_sale,
        p.stock,
        p.active,
        (
          SELECT url
          FROM public.product_images pi
          WHERE pi.product_id = p.id
          ORDER BY pi.sort_order ASC NULLS LAST, pi.created_at ASC
          LIMIT 1
        ) AS primary_image,
        COALESCE(
          (
            SELECT ARRAY_AGG(ps.name ORDER BY CASE LOWER(ps.name)
              WHEN 's/m' THEN 1
              WHEN 'm/l' THEN 2
              WHEN 'l/xl' THEN 3
              ELSE 100 END, ps.name ASC)
            FROM public.product_sizes ps
            WHERE ps.product_id = p.id
          ),
          '{}'::text[]
        ) AS sizes
      FROM public.products p
      WHERE p.id = ANY(${productIds}::uuid[])
    `) as Array<{
      id: string;
      slug: string;
      name: string;
      price_cents: number;
      sale_price_cents: number | null;
      original_price_cents: number | null;
      is_sale: boolean;
      stock: number;
      active: boolean;
      primary_image: string | null;
      sizes: string[];
    }>;

    const productMap = new Map(products.map((p) => [p.id, p]));
    for (const input of itemInputs) {
      const product = productMap.get(input.productId);
      if (!product || !product.active) {
        return NextResponse.json({ error: "Product not available" }, { status: 400 });
      }
      const availableSizes = sortSizes(
        (product.sizes ?? []).map((s) => normalizeSize(s)).filter((s): s is string => Boolean(s))
      );
      if (availableSizes.length) {
        const normalized = normalizeSize(input.size);
        if (!normalized || !availableSizes.includes(normalized)) {
          return NextResponse.json(
            { error: `Size required for ${product.name}` },
            { status: 400 }
          );
        }
        input.size = normalized;
      } else {
        input.size = null;
      }
      if (product.stock < input.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.name}` },
          { status: 409 }
        );
      }
    }

    const orderItems = itemInputs.map((input) => {
      const product = productMap.get(input.productId)!;
      const price = product.is_sale && product.sale_price_cents != null
        ? product.sale_price_cents
        : product.price_cents;
      return {
        product_id: product.id,
        product_slug: product.slug,
        name: product.name,
        image_url: product.primary_image,
        price_cents: price,
        quantity: input.quantity,
        variant: input.variant ?? null,
        size: input.size,
      };
    });

    const subtotalCents = orderItems.reduce(
      (sum, item) => sum + item.price_cents * item.quantity,
      0
    );

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
    const results = (await sql`
      WITH new_order AS (
        INSERT INTO public.orders (
          user_id,
          customer_name,
          customer_phone,
          email,
          status,
          contact,
          shipping_address,
          delivery_option,
          promo_code,
          subtotal_cents,
          payment_provider,
          currency,
          stripe_checkout_session_id,
          stripe_payment_intent_id
        )
        VALUES (
          ${null},
          ${customerName},
          ${body.contact.phone?.trim?.() || null},
          ${body.contact.email.trim()},
          'created',
          ${contactJson}::jsonb,
          ${shippingJson}::jsonb,
          ${body.deliveryOption},
          ${body.promoCode?.trim?.() || null},
          ${subtotalCents},
          'stripe',
          'usd',
          null,
          null
        )
        RETURNING id
      ),
      inserted_items AS (
        INSERT INTO public.order_items (
          order_id,
          product_id,
          product_slug,
          name,
          image_url,
          price_cents,
          variant,
          size,
          quantity
        )
        SELECT
          (SELECT id FROM new_order),
          item.product_id::uuid,
          item.product_slug,
          item.name,
          item.image_url,
          item.price_cents,
          item.variant,
          item.size,
          item.quantity
        FROM jsonb_to_recordset(${JSON.stringify(orderItems)}::jsonb) AS item(
          product_id text,
          product_slug text,
          name text,
          image_url text,
          price_cents int,
          variant text,
          size text,
          quantity int
        )
      ),
      updated_stock AS (
        UPDATE public.products p
        SET stock = p.stock - src.qty
        FROM (
          SELECT product_id::uuid AS pid, SUM(quantity) AS qty
          FROM jsonb_to_recordset(${JSON.stringify(orderItems)}::jsonb) AS item(
            product_id text,
            product_slug text,
            name text,
            image_url text,
            price_cents int,
            variant text,
            size text,
            quantity int
          )
          GROUP BY product_id
        ) AS src
        WHERE p.id = src.pid
      )
      SELECT id AS order_id FROM new_order
    `) as Array<{ order_id: string }>;

    const orderId = results[0]?.order_id;
    if (!orderId) {
      throw new Error("Failed to create order");
    }

    const origin = new URL(request.url).origin;
    const successTemplate =
      process.env.STRIPE_SUCCESS_URL || `${origin}/order/{ORDER_ID}?success=1`;
    const cancelTemplate = process.env.STRIPE_CANCEL_URL || `${origin}/checkout?canceled=1`;
    const successUrl = successTemplate.replace("{ORDER_ID}", orderId);
    const cancelUrl = cancelTemplate.replace("{ORDER_ID}", orderId);

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

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      metadata: { order_id: orderId },
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    await sql`
      UPDATE public.orders
      SET
        stripe_checkout_session_id = ${session.id},
        stripe_payment_intent_id = ${session.payment_intent ? String(session.payment_intent) : null},
        payment_provider = 'stripe',
        currency = ${session.currency ?? "usd"}
      WHERE id = ${orderId}::uuid
    `;

    if (!session.url) {
      throw new Error("Stripe session missing url");
    }

    return NextResponse.json({ url: session.url, orderId });
  } catch (err) {
    console.error("Checkout error", err);
    return NextResponse.json({ error: "Unable to process order" }, { status: 500 });
  }
}
