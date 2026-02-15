import { NextResponse } from "next/server";

import sql from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SeedBody = {
  productId?: string;
  email?: string;
};

const isUuid = (value: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    value
  );

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }

  let body: SeedBody;
  try {
    body = (await request.json()) as SeedBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const productId = body.productId?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";

  if (!productId || !isUuid(productId)) {
    return NextResponse.json({ error: "Valid productId is required" }, { status: 400 });
  }
  if (!email || !emailRegex.test(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  try {
    const products = (await sql`
      SELECT
        p.id,
        p.slug,
        p.name,
        CASE
          WHEN p.is_sale = true AND p.sale_price_cents IS NOT NULL THEN p.sale_price_cents
          ELSE p.price_cents
        END::int AS effective_price_cents,
        (
          SELECT pi.url
          FROM public.product_images pi
          WHERE pi.product_id = p.id
          ORDER BY pi.sort_order ASC NULLS LAST, pi.created_at ASC
          LIMIT 1
        ) AS image_url
      FROM public.products p
      WHERE p.id = ${productId}::uuid AND p.active = true
      LIMIT 1
    `) as Array<{
      id: string;
      slug: string;
      name: string;
      effective_price_cents: number;
      image_url: string | null;
    }>;

    const product = products[0];
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const shippingCents = 600;
    const subtotalCents = product.effective_price_cents;
    const totalCents = subtotalCents + shippingCents;
    const shippingAddress = {
      firstName: "E2E",
      lastName: "Buyer",
      address1: "123 Test St",
      address2: "Suite 5",
      city: "Des Moines",
      state: "IA",
      zip: "50309",
      country: "US",
    };
    const contact = {
      email,
      phone: "+1 (555) 000-0000",
      name: "E2E Buyer",
    };

    const orderRows = (await sql`
      INSERT INTO public.orders (
        email,
        status,
        contact,
        shipping_address,
        delivery_option,
        subtotal_cents,
        discount_cents,
        shipping_cents,
        payment_provider,
        currency,
        paid_at
      )
      VALUES (
        ${email},
        'paid',
        ${JSON.stringify(contact)}::jsonb,
        ${JSON.stringify(shippingAddress)}::jsonb,
        'flat',
        ${subtotalCents},
        0,
        ${shippingCents},
        'stripe',
        'usd',
        now()
      )
      RETURNING id
    `) as Array<{ id: string }>;

    const orderId = orderRows[0]?.id;
    if (!orderId) {
      return NextResponse.json({ error: "Unable to seed order" }, { status: 500 });
    }

    await sql`
      INSERT INTO public.order_items (
        order_id,
        product_id,
        product_slug,
        name,
        image_url,
        price_cents,
        unit_price_cents,
        variant,
        size,
        quantity
      )
      VALUES (
        ${orderId}::uuid,
        ${product.id}::uuid,
        ${product.slug},
        ${product.name},
        ${product.image_url},
        ${product.effective_price_cents},
        ${product.effective_price_cents},
        null,
        null,
        1
      )
    `;

    const rateId = `e2e-rate-${Date.now().toString(36)}`;
    const rates = [
      {
        id: rateId,
        amount: 4.25,
        currency: "USD",
        provider: "E2E Shippo",
        service: "Ground",
        estimated_days: 3,
      },
    ];
    const parcel = {
      length: 8,
      width: 8,
      height: 4,
      distance_unit: "in",
      weight: 12,
      mass_unit: "oz",
    };

    const shipmentRows = (await sql`
      INSERT INTO public.shipments (
        order_id,
        provider,
        status,
        rates,
        parcel
      )
      VALUES (
        ${orderId}::uuid,
        'shippo',
        'draft',
        ${JSON.stringify(rates)}::jsonb,
        ${JSON.stringify(parcel)}::jsonb
      )
      ON CONFLICT (order_id)
      DO UPDATE
      SET
        provider = 'shippo',
        status = 'draft',
        rates = EXCLUDED.rates,
        parcel = EXCLUDED.parcel
      RETURNING id
    `) as Array<{ id: string }>;

    return NextResponse.json(
      {
        ok: true,
        orderId,
        shipmentId: shipmentRows[0]?.id ?? null,
        rateId,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("seed-paid-order-for-shipping error", err);
    return NextResponse.json(
      {
        error: "Unable to seed paid shipping order",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
