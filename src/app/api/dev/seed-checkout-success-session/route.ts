import { NextResponse } from "next/server";

import sql from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SeedBody = {
  sessionId?: string;
  email?: string;
  productId?: string;
};

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  effective_price_cents: number;
  image_url: string | null;
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isUuid = (value: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    value
  );

function buildSessionId(raw?: string) {
  const trimmed = raw?.trim();
  if (trimmed) return trimmed;
  return `cs_test_E2E_SUCCESS_${Date.now().toString(36)}`;
}

async function getSeedProduct(productId?: string) {
  if (productId) {
    const rows = (await sql`
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
    `) as ProductRow[];

    return rows[0] ?? null;
  }

  const rows = (await sql`
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
    WHERE p.active = true
      AND COALESCE(p.stock, 0) > 0
    ORDER BY p.created_at DESC
    LIMIT 1
  `) as ProductRow[];

  return rows[0] ?? null;
}

async function ensureOrderPricingColumns() {
  await sql`
    ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS tax_cents int
  `;
  await sql`
    ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS total_cents int
  `;
}

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

  const sessionId = buildSessionId(body.sessionId);
  const email =
    body.email?.trim().toLowerCase() ??
    `e2e-checkout-success-${Date.now().toString(36)}@example.com`;
  const productId = body.productId?.trim() ?? "";

  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  if (productId && !isUuid(productId)) {
    return NextResponse.json({ error: "productId must be a valid uuid" }, { status: 400 });
  }

  if (!/^cs_test_E2E_SUCCESS_/i.test(sessionId)) {
    return NextResponse.json(
      { error: "sessionId must start with cs_test_E2E_SUCCESS_" },
      { status: 400 }
    );
  }

  try {
    await ensureOrderPricingColumns();

    const product = await getSeedProduct(productId || undefined);
    if (!product) {
      return NextResponse.json({ error: "No active product found for seed" }, { status: 404 });
    }

    const existingRows = (await sql`
      SELECT id
      FROM public.orders
      WHERE stripe_checkout_session_id = ${sessionId}
      LIMIT 1
    `) as Array<{ id: string }>;

    let orderId = existingRows[0]?.id ?? null;
    if (!orderId) {
      const shippingCents = 600;
      const subtotalCents = product.effective_price_cents;
      const taxCents = 0;
      const totalCents = subtotalCents + shippingCents + taxCents;

      const shippingAddress = {
        firstName: "E2E",
        lastName: "Checkout",
        address1: "123 Success Ave",
        address2: null,
        city: "Des Moines",
        state: "IA",
        zip: "50309",
        country: "US",
      };
      const contact = {
        email,
        phone: "+1 (555) 000-1111",
        notes: "E2E checkout success seed",
      };

      const inserted = (await sql`
        INSERT INTO public.orders (
          email,
          status,
          contact,
          shipping_address,
          delivery_option,
          subtotal_cents,
          discount_cents,
          shipping_cents,
          tax_cents,
          total_cents,
          payment_provider,
          currency,
          stripe_checkout_session_id,
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
          ${taxCents},
          ${totalCents},
          'stripe',
          'usd',
          ${sessionId},
          now()
        )
        RETURNING id
      `) as Array<{ id: string }>;

      orderId = inserted[0]?.id ?? null;
    }

    if (!orderId) {
      return NextResponse.json({ error: "Unable to seed checkout success order" }, { status: 500 });
    }

    const existingItems = (await sql`
      SELECT id
      FROM public.order_items
      WHERE order_id = ${orderId}::uuid
      LIMIT 1
    `) as Array<{ id: string }>;

    if (!existingItems[0]) {
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
    }

    return NextResponse.json(
      {
        ok: true,
        sessionId,
        orderId,
        email,
        productId: product.id,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("seed-checkout-success-session error", err);
    return NextResponse.json(
      {
        error: "Unable to seed checkout success session",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
