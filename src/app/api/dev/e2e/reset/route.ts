import { NextResponse } from "next/server";

import sql from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type ResetBody = {
  runId?: string;
};

type TableRow = {
  table_name: string;
};

const RUN_ID_PATTERN = /^[a-z0-9](?:[a-z0-9_-]{0,62}[a-z0-9])?$/i;

const TARGET_TABLES = [
  "checkout_sessions",
  "email_events",
  "marketing_subscribers",
  "order_items",
  "orders",
  "product_images",
  "product_sizes",
  "product_variants",
  "products",
  "promo_codes",
  "review_helpful_votes",
  "reviews",
  "shipments",
] as const;

async function countDeleted(promise: PromiseLike<unknown>) {
  const rows = await promise;
  return Array.isArray(rows) ? rows.length : 0;
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }

  let body: ResetBody;
  try {
    body = (await request.json()) as ResetBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const runId = body.runId?.trim().toLowerCase() ?? "";
  if (!runId || !RUN_ID_PATTERN.test(runId)) {
    return NextResponse.json(
      { error: "runId is required and must match [a-z0-9_-]" },
      { status: 400 }
    );
  }

  const productSlugPrefix = `e2e-${runId}`;
  const productSlugLike = `${productSlugPrefix}%`;
  const emailLike = `e2e-${runId}-%@example.com`;
  const promoCodeLike = `E2E_${runId.replace(/[^a-z0-9]/gi, "_").toUpperCase()}_%`;
  const checkoutSuccessSessionLike = `cs_test_E2E_SUCCESS_${runId.replace(
    /[^a-z0-9]/gi,
    "_"
  )}%`;

  try {
    const existingRows = (await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY(${[...TARGET_TABLES]}::text[])
    `) as TableRow[];
    const hasTable = new Set(existingRows.map((row) => row.table_name));

    const summary = {
      runId,
      deleted: {
        review_helpful_votes: 0,
        reviews: 0,
        email_events: 0,
        shipments: 0,
        order_items: 0,
        checkout_sessions: 0,
        orders: 0,
        marketing_subscribers: 0,
        promo_codes: 0,
        product_sizes: 0,
        product_variants: 0,
        product_images: 0,
        products: 0,
      },
    };

    const productIds =
      hasTable.has("products")
        ? (
            (await sql`
              SELECT id
              FROM public.products
              WHERE slug LIKE ${productSlugLike}
            `) as Array<{ id: string }>
          ).map((row) => row.id)
        : [];

    const orderIds =
      hasTable.has("orders")
        ? (
            (await sql`
              SELECT id
              FROM public.orders
              WHERE lower(email) LIKE lower(${emailLike})
                 OR stripe_checkout_session_id LIKE ${checkoutSuccessSessionLike}
            `) as Array<{ id: string }>
          ).map((row) => row.id)
        : [];

    if (hasTable.has("review_helpful_votes") && hasTable.has("reviews")) {
      summary.deleted.review_helpful_votes = await countDeleted(
        sql`
          WITH target_reviews AS (
            SELECT id
            FROM public.reviews
            WHERE
              lower(author_email) LIKE lower(${emailLike})
              OR product_slug LIKE ${productSlugLike}
              OR product_id = ANY(${productIds}::uuid[])
          )
          DELETE FROM public.review_helpful_votes
          WHERE review_id IN (SELECT id FROM target_reviews)
          RETURNING id
        `
      );
    }

    if (hasTable.has("reviews")) {
      summary.deleted.reviews = await countDeleted(
        sql`
          DELETE FROM public.reviews
          WHERE
            lower(author_email) LIKE lower(${emailLike})
            OR product_slug LIKE ${productSlugLike}
            OR product_id = ANY(${productIds}::uuid[])
          RETURNING id
        `
      );
    }

    if (hasTable.has("email_events")) {
      summary.deleted.email_events = await countDeleted(
        sql`
          DELETE FROM public.email_events
          WHERE order_id = ANY(${orderIds}::uuid[])
          RETURNING id
        `
      );
    }

    if (hasTable.has("shipments")) {
      summary.deleted.shipments = await countDeleted(
        sql`
          DELETE FROM public.shipments
          WHERE order_id = ANY(${orderIds}::uuid[])
          RETURNING id
        `
      );
    }

    if (hasTable.has("order_items")) {
      summary.deleted.order_items = await countDeleted(
        sql`
          DELETE FROM public.order_items
          WHERE
            order_id = ANY(${orderIds}::uuid[])
            OR product_slug LIKE ${productSlugLike}
            OR product_id = ANY(${productIds}::uuid[])
          RETURNING id
        `
      );
    }

    if (hasTable.has("checkout_sessions")) {
      summary.deleted.checkout_sessions = await countDeleted(
        sql`
          DELETE FROM public.checkout_sessions
          WHERE
            lower(email) LIKE lower(${emailLike})
            OR order_id = ANY(${orderIds}::uuid[])
            OR stripe_checkout_session_id LIKE ${checkoutSuccessSessionLike}
          RETURNING id
        `
      );
    }

    if (hasTable.has("orders")) {
      summary.deleted.orders = await countDeleted(
        sql`
          DELETE FROM public.orders
          WHERE lower(email) LIKE lower(${emailLike})
             OR id = ANY(${orderIds}::uuid[])
             OR stripe_checkout_session_id LIKE ${checkoutSuccessSessionLike}
          RETURNING id
        `
      );
    }

    if (hasTable.has("marketing_subscribers")) {
      summary.deleted.marketing_subscribers = await countDeleted(
        sql`
          DELETE FROM public.marketing_subscribers
          WHERE lower(email) LIKE lower(${emailLike})
          RETURNING id
        `
      );
    }

    if (hasTable.has("promo_codes")) {
      summary.deleted.promo_codes = await countDeleted(
        sql`
          DELETE FROM public.promo_codes
          WHERE upper(code) LIKE ${promoCodeLike}
          RETURNING id
        `
      );
    }

    if (hasTable.has("product_sizes")) {
      summary.deleted.product_sizes = await countDeleted(
        sql`
          DELETE FROM public.product_sizes
          WHERE product_id = ANY(${productIds}::uuid[])
          RETURNING id
        `
      );
    }

    if (hasTable.has("product_variants")) {
      summary.deleted.product_variants = await countDeleted(
        sql`
          DELETE FROM public.product_variants
          WHERE product_id = ANY(${productIds}::uuid[])
          RETURNING id
        `
      );
    }

    if (hasTable.has("product_images")) {
      summary.deleted.product_images = await countDeleted(
        sql`
          DELETE FROM public.product_images
          WHERE product_id = ANY(${productIds}::uuid[])
          RETURNING id
        `
      );
    }

    if (hasTable.has("products")) {
      summary.deleted.products = await countDeleted(
        sql`
          DELETE FROM public.products
          WHERE id = ANY(${productIds}::uuid[])
          RETURNING id
        `
      );
    }

    return NextResponse.json({ ok: true, summary }, { status: 200 });
  } catch (err) {
    console.error("e2e reset error", err);
    return NextResponse.json({ error: "Unable to reset E2E data" }, { status: 500 });
  }
}

