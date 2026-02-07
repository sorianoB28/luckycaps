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
      p.name_en,
      p.name_es,
      p.category,
      p.description,
      p.description_en,
      p.description_es,
      p.price_cents,
      p.sale_price_cents,
      p.original_price_cents,
      p.is_new_drop,
      p.is_sale,
      p.tags,
      p.features,
      p.stock,
      p.active,
      p.translation_updated_at
    FROM public.products p
    WHERE p.id = ${id}::uuid
    LIMIT 1
  `) as unknown as {
    id: string;
    slug: string;
    name: string;
    name_en?: string | null;
    name_es?: string | null;
    category: string;
    description: string;
    description_en?: string | null;
    description_es?: string | null;
    price_cents: number;
    sale_price_cents: number | null;
    original_price_cents: number | null;
    is_new_drop: boolean;
    is_sale: boolean;
    tags: string[];
    features: string[];
    stock: number;
    active: boolean;
    translation_updated_at?: string | null;
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
        name_en,
        name_es,
        category,
        description,
        description_en,
        description_es,
        price_cents,
        sale_price_cents,
        original_price_cents,
        is_new_drop,
        is_sale,
        tags,
        features,
        stock,
        active,
        translation_updated_at
      )
      VALUES (
        ${candidateSlug},
        ${newName},
        ${product.name_en},
        ${product.name_es},
        ${product.category},
        ${product.description},
        ${product.description_en},
        ${product.description_es},
        ${product.price_cents},
        ${product.sale_price_cents},
        ${product.original_price_cents},
        ${product.is_new_drop},
        ${product.is_sale},
        ${product.tags},
        ${product.features},
        ${product.stock},
        ${product.active},
        ${product.translation_updated_at}
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
