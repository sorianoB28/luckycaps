import { NextResponse } from "next/server";

import sql from "@/lib/db";

type ReviewRow = {
  id: string;
  product_slug: string;
  rating: number;
  title: string;
  body: string;
  author_name: string | null;
  variant: string | null;
  size: string | null;
  images: string[];
  verified_purchase: boolean;
  helpful_count: number;
  created_at: string;
};

type SummaryRow = {
  avg_rating: number | null;
  review_count: number;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const productSlug = searchParams.get("product_slug")?.trim();

  if (!productSlug) {
    return NextResponse.json(
      { error: "product_slug is required" },
      { status: 400 }
    );
  }

  const reviews = (await sql`
    SELECT
      r.id,
      r.product_slug,
      r.rating,
      r.title,
      r.body,
      r.author_name,
      r.variant,
      r.size,
      r.images,
      r.verified_purchase,
      COALESCE(v.helpful_count, 0)::int AS helpful_count,
      r.created_at
    FROM public.reviews r
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS helpful_count
      FROM public.review_helpful_votes hv
      WHERE hv.review_id = r.id
    ) v ON TRUE
    WHERE r.product_slug = ${productSlug} AND r.reported = false
    ORDER BY r.created_at DESC
  `) as unknown as ReviewRow[];

  const summaryRows = (await sql`
    SELECT
      AVG(rating)::float8 AS avg_rating,
      COUNT(*)::int AS review_count
    FROM public.reviews
    WHERE product_slug = ${productSlug} AND reported = false
  `) as unknown as SummaryRow[];

  const summary = summaryRows[0] ?? { avg_rating: null, review_count: 0 };

  return NextResponse.json({ reviews, summary });
}

type CreateReviewPayload = {
  product_id?: string | null;
  product_slug?: string | null;
  rating?: number | null;
  title?: string | null;
  body?: string | null;
  author_email?: string | null;
  author_name?: string | null;
  variant?: string | null;
  size?: string | null;
  images?: string[] | null;
};

export async function POST(request: Request) {
  let payload: CreateReviewPayload;
  try {
    payload = (await request.json()) as CreateReviewPayload;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const errors: Record<string, string> = {};

  const productId = payload.product_id?.trim();
  const productSlug = payload.product_slug?.trim();
  const rating = payload.rating;
  const title = payload.title?.trim() ?? "";
  const body = payload.body?.trim() ?? "";
  const authorEmail = payload.author_email?.trim() ?? "";
  const authorName = payload.author_name?.trim() || null;
  const variant = payload.variant?.trim() || null;
  const size = payload.size?.trim() || null;
  const images = Array.isArray(payload.images)
    ? payload.images.filter((img) => typeof img === "string" && img.trim().length > 0)
    : [];
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!productId) {
    errors.product_id = "product_id is required";
  } else if (!uuidPattern.test(productId)) {
    errors.product_id = "product_id must be a valid UUID";
  }

  if (!productSlug) {
    errors.product_slug = "product_slug is required";
  }

  if (rating == null || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    errors.rating = "rating must be an integer between 1 and 5";
  }

  if (!title) {
    errors.title = "title is required";
  } else if (title.length > 200) {
    errors.title = "title is too long";
  }

  if (!body) {
    errors.body = "body is required";
  } else if (body.length > 5000) {
    errors.body = "body is too long";
  }

  if (!authorEmail) {
    errors.author_email = "author_email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authorEmail)) {
    errors.author_email = "author_email must be valid";
  }

  if (Object.keys(errors).length) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  const productRows = (await sql`
    SELECT id
    FROM public.products
    WHERE id = ${productId}::uuid AND slug = ${productSlug} AND active = true
    LIMIT 1
  `) as unknown as { id: string }[];

  if (!productRows.length) {
    return NextResponse.json(
      { errors: { product_id: "Invalid product reference" } },
      { status: 400 }
    );
  }

  const insertRows = (await sql`
    INSERT INTO public.reviews (
      product_id,
      product_slug,
      rating,
      title,
      body,
      author_email,
      author_name,
      variant,
      size,
      images
    )
    VALUES (
      ${productId}::uuid,
      ${productSlug},
      ${rating},
      ${title},
      ${body},
      ${authorEmail},
      ${authorName},
      ${variant},
      ${size},
      ${images}
    )
    RETURNING id
  `) as unknown as { id: string }[];

  const inserted = insertRows[0];

  return NextResponse.json({ reviewId: inserted.id }, { status: 201 });
}
