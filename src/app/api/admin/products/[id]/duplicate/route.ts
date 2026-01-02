import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/adminAuth";
import sql from "@/lib/adminDb";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id } = params;

  if (!uuidPattern.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const rows = (await sql`
    SELECT
      p.id,
      p.slug,
      p.name,
      p.category,
      p.description,
      p.price_cents,
      p.sale_price_cents,
      p.original_price_cents,
      p.is_new_drop,
      p.is_sale,
      p.tags,
      p.features,
      p.stock,
      p.active
    FROM public.products p
    WHERE p.id = ${id}::uuid
    LIMIT 1
  `) as unknown as {
    id: string;
    slug: string;
    name: string;
    category: string;
    description: string;
    price_cents: number;
    sale_price_cents: number | null;
    original_price_cents: number | null;
    is_new_drop: boolean;
    is_sale: boolean;
    tags: string[];
    features: string[];
    stock: number;
    active: boolean;
  }[];

  const product = rows[0];

  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const baseSlug = `${product.slug}-copy`;
  let candidateSlug = baseSlug;
  let counter = 2;

  // ensure slug uniqueness
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const exists = await sql`
      SELECT 1 FROM public.products WHERE slug = ${candidateSlug} LIMIT 1
    `;
    if ((exists as unknown[]).length === 0) break;
    candidateSlug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  const newName = `${product.name} (Copy)`;

  const insertRows = (await sql`
    WITH duplicated AS (
      INSERT INTO public.products (
        slug,
        name,
        category,
        description,
        price_cents,
        sale_price_cents,
        original_price_cents,
        is_new_drop,
        is_sale,
        tags,
        features,
        stock,
        active
      )
      VALUES (
        ${candidateSlug},
        ${newName},
        ${product.category},
        ${product.description},
        ${product.price_cents},
        ${product.sale_price_cents},
        ${product.original_price_cents},
        ${product.is_new_drop},
        ${product.is_sale},
        ${product.tags},
        ${product.features},
        ${product.stock},
        ${product.active}
      )
      RETURNING id
    ),
    copied_images AS (
      INSERT INTO public.product_images (product_id, url, sort_order)
      SELECT
        (SELECT id FROM duplicated),
        pi.url,
        pi.sort_order
      FROM public.product_images pi
      WHERE pi.product_id = ${id}::uuid
    )
    SELECT id FROM duplicated
  `) as unknown as { id: string }[];

  const inserted = insertRows[0];

  return NextResponse.json({ productId: inserted.id }, { status: 201 });
}
