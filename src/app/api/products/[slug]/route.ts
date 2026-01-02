import { NextResponse } from "next/server";
import sql from "@/lib/db";

type RouteParams = {
  params: { slug: string };
};

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  image_url?: string | null;
  price_cents: number;
  sale_price_cents: number | null;
  original_price_cents: number | null;
  is_new_drop: boolean;
  is_sale: boolean;
  tags: string[] | null;
  features: string[] | null;
  stock: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type ProductImageRow = {
  id: string;
  product_id: string;
  url: string;
  sort_order: number | null;
  created_at: string;
};

type ProductSizeRow = {
  id: string;
  product_id: string;
  name: string;
  created_at: string;
};

type ProductVariantRow = {
  id: string;
  product_id: string;
  name: string;
  created_at: string;
};

type ReviewRow = {
  id: string;
  product_id: string;
  product_slug: string;
  rating: number;
  title: string;
  body: string;
  author_email: string;
  author_name: string | null;
  variant: string | null;
  size: string | null;
  images: string[] | null;
  verified_purchase: boolean;
  helpful_count: number;
  reported: boolean;
  created_at: string;
};

type ReviewSummaryRow = {
  count: number;
  avg_rating: number | null;
};

export async function GET(_request: Request, { params }: RouteParams) {
  const { slug } = params;

  const productRows = (await sql`
    SELECT
      id,
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
      active,
      created_at,
      updated_at
    FROM public.products
    WHERE slug = ${slug} AND active = true
    LIMIT 1
  `) as unknown as ProductRow[];

  const product = productRows[0];

  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const images = (await sql`
    SELECT id, product_id, url, sort_order, created_at
    FROM public.product_images
    WHERE product_id = ${product.id}
    ORDER BY sort_order ASC NULLS LAST, created_at ASC
  `) as unknown as ProductImageRow[];

  const sizes = (await sql`
    SELECT id, product_id, name, created_at
    FROM public.product_sizes
    WHERE product_id = ${product.id}
    ORDER BY name ASC
  `) as unknown as ProductSizeRow[];

  const variants = (await sql`
    SELECT id, product_id, name, created_at
    FROM public.product_variants
    WHERE product_id = ${product.id}
    ORDER BY name ASC
  `) as unknown as ProductVariantRow[];

  const reviews = (await sql`
    SELECT
      id,
      product_id,
      product_slug,
      rating,
      title,
      body,
      author_email,
      author_name,
      variant,
      size,
      images,
      verified_purchase,
      helpful_count,
      reported,
      created_at
    FROM public.reviews
    WHERE product_id = ${product.id} AND reported = false
    ORDER BY created_at DESC
    LIMIT 20
  `) as unknown as ReviewRow[];

  const reviewSummaryRows = (await sql`
    SELECT
      COUNT(*)::int AS count,
      AVG(rating)::float8 AS avg_rating
    FROM public.reviews
    WHERE product_id = ${product.id} AND reported = false
  `) as unknown as ReviewSummaryRow[];

  const summary = reviewSummaryRows[0];

  const imageUrl = images[0]?.url ?? null;

  return NextResponse.json({
    product: { ...product, image_url: imageUrl },
    images,
    sizes,
    variants,
    reviewSummary: {
      count: summary?.count ?? 0,
      avgRating: summary?.avg_rating ?? null,
    },
    reviews,
  });
}
export const dynamic = "force-dynamic";
export const revalidate = 0;
