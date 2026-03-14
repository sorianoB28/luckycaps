import { NextResponse } from "next/server";

import { blockDevRouteInProduction } from "@/lib/devRoutes";
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
  const blockedResponse = blockDevRouteInProduction();
  if (blockedResponse) return blockedResponse;

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
        id,
        slug,
        name,
        CASE
          WHEN is_sale = true AND sale_price_cents IS NOT NULL THEN sale_price_cents
          ELSE price_cents
        END::int AS effective_price_cents,
        (
          SELECT pi.url
          FROM public.product_images pi
          WHERE pi.product_id = p.id
          ORDER BY pi.sort_order ASC NULLS LAST, pi.created_at ASC
          LIMIT 1
        ) AS image_url
      FROM public.products p
      WHERE id = ${productId}::uuid AND active = true
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
        ${JSON.stringify({ email })}::jsonb,
        ${JSON.stringify({})}::jsonb,
        'flat',
        ${product.effective_price_cents},
        0,
        0,
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

    return NextResponse.json({ ok: true, orderId }, { status: 201 });
  } catch (err) {
    console.error("seed-paid-order-for-review error", err);
    return NextResponse.json({ error: "Unable to seed paid order" }, { status: 500 });
  }
}
