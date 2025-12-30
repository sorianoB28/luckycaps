// src/app/api/products/route.ts
import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET() {
  const rows = await sql`
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
      p.active,
      p.created_at,
      p.updated_at,
      img.url AS image_url
    FROM public.products p
    LEFT JOIN LATERAL (
      SELECT url
      FROM public.product_images pi
      WHERE pi.product_id = p.id
      ORDER BY pi.sort_order ASC NULLS LAST, pi.created_at ASC
      LIMIT 1
    ) img ON true
    WHERE p.active = true
    ORDER BY p.created_at DESC
  `;

  return NextResponse.json(rows);
}
