import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/adminAuth";
import sql from "@/lib/adminDb";
import { slugify } from "@/lib/slugify";
import { cloudinary } from "@/lib/cloudinary";
import { normalizeSize, sortSizes } from "@/lib/sizeOptions";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function ensurePublicIdColumn() {
  await sql`
    ALTER TABLE IF NOT EXISTS public.product_images
    ADD COLUMN IF NOT EXISTS public_id text
  `;
}

type ImageInput = { url: string; publicId?: string | null } | string;

const normalizeImages = (images?: unknown) => {
  if (!Array.isArray(images)) return [];
  return images
    .map((img) => {
      const url = typeof img === "string" ? img : img?.url;
      const publicId = typeof img === "string" ? null : img?.publicId ?? null;
      if (!url) return null;
      if (url.startsWith("data:")) return null;
      try {
        const parsed = new URL(url);
        if (parsed.hostname === "example.com") return null;
        if (!["http:", "https:"].includes(parsed.protocol)) return null;
        return { url: parsed.toString(), publicId };
      } catch {
        return null;
      }
    })
    .filter(Boolean) as { url: string; publicId: string | null }[];
};

const centsFromNumber = (value?: unknown) => {
  if (value == null || value === "") return null;
  const num = Number(value);
  if (Number.isNaN(num) || !Number.isFinite(num)) return null;
  return Math.round(num * 100);
};

type AdminProductRow = {
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
  created_at: string;
  image_url: string | null;
  images: string[];
  sizes: string[];
};

export async function GET(request: Request, { params }: { params: { id: string } }) {
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
      p.active,
      p.created_at,
      (
        SELECT url
        FROM public.product_images pi
        WHERE pi.product_id = p.id
        ORDER BY pi.sort_order ASC NULLS LAST, pi.created_at ASC
        LIMIT 1
      ) AS image_url,
      COALESCE(
        (
          SELECT ARRAY_AGG(pi.url ORDER BY pi.sort_order ASC NULLS LAST, pi.created_at ASC)
          FROM public.product_images pi
          WHERE pi.product_id = p.id
        ),
        '{}'::text[]
      ) AS images,
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
    WHERE p.id = ${id}::uuid
    LIMIT 1
  `) as unknown as AdminProductRow[];

  const product = rows[0];

  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(product);
}

type AdminProductPayload = {
  name?: string;
  slug?: string;
  category?: string;
  description?: string;
  price?: number;
  salePrice?: number | null;
  originalPrice?: number | null;
  isSale?: boolean;
  isNewDrop?: boolean;
  stock?: number;
  images?: ImageInput[];
  active?: boolean;
  sizes?: string[];
};

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id } = params;

  if (!uuidPattern.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let payload: AdminProductPayload;
  try {
    payload = (await request.json()) as AdminProductPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const errors: Record<string, string> = {};

  const existingRows = (await sql`
    SELECT active
    FROM public.products
    WHERE id = ${id}::uuid
    LIMIT 1
  `) as unknown as { active: boolean }[];

  if (!existingRows.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const name = payload.name?.trim() ?? "";
  const slug = slugify(payload.slug?.trim() || name);
  const category = payload.category?.trim() ?? "";
  const description = payload.description?.trim() ?? "";
  const isSale = Boolean(payload.isSale);
  const isNewDrop = Boolean(payload.isNewDrop);
  const stock = Number(payload.stock ?? 0);
  const priceCents = centsFromNumber(payload.price);
  const salePriceCents = isSale ? centsFromNumber(payload.salePrice ?? payload.price) : null;
  const originalPriceCents = isSale
    ? centsFromNumber(payload.originalPrice ?? payload.price ?? payload.salePrice)
    : centsFromNumber(payload.originalPrice);
  const images = normalizeImages(payload.images);
  const active = payload.active ?? existingRows[0].active;
  const sizes = sortSizes(
    (Array.isArray(payload.sizes) ? payload.sizes : [])
      .map((s) => normalizeSize(typeof s === "string" ? s : null))
      .filter((s): s is string => Boolean(s))
      .filter((s, idx, arr) => arr.indexOf(s) === idx)
  );

  if (!name) {
    errors.name = "Name is required";
  }
  if (!slug) {
    errors.slug = "Slug is required";
  }
  if (priceCents == null || priceCents < 0) {
    errors.price = "Price must be a valid number";
  }
  if (isSale && (salePriceCents == null || salePriceCents < 0)) {
    errors.salePrice = "Sale price is required when on sale";
  }
  if (!Number.isInteger(stock) || stock < 0) {
    errors.stock = "Stock must be 0 or greater";
  }

  if (Object.keys(errors).length) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  try {
    await ensurePublicIdColumn();
    const existingImages = (await sql`
      SELECT url, public_id
      FROM public.product_images
      WHERE product_id = ${id}::uuid
      ORDER BY sort_order ASC, created_at ASC
    `) as unknown as { url: string; public_id: string | null }[];

    const incomingUrls = new Set(images.map((img) => img.url));
    const removed = existingImages.filter((img) => !incomingUrls.has(img.url) && img.public_id);

    for (const img of removed) {
      if (img.public_id) {
        const result = await cloudinary.uploader.destroy(img.public_id);
        if (result.result !== "ok" && result.result !== "not found") {
          throw new Error(`Failed to delete image ${img.public_id} from Cloudinary`);
        }
      }
    }

    const imagesWithIds = images.map((img) => {
      const existingMatch = existingImages.find((ex) => ex.url === img.url);
      return { url: img.url, publicId: img.publicId ?? existingMatch?.public_id ?? null };
    });

    await sql`
      WITH updated AS (
        UPDATE public.products
        SET
          slug = ${slug},
          name = ${name},
          category = ${category},
          description = ${description},
          price_cents = ${priceCents},
          sale_price_cents = ${salePriceCents},
          original_price_cents = ${originalPriceCents},
          is_new_drop = ${isNewDrop},
          is_sale = ${isSale},
          stock = ${stock},
          active = ${active},
          updated_at = now()
        WHERE id = ${id}::uuid
        RETURNING id
      ),
      removed_sizes AS (
        DELETE FROM public.product_sizes
        WHERE product_id = (SELECT id FROM updated)
      ),
      inserted_sizes AS (
        INSERT INTO public.product_sizes (product_id, name)
        SELECT (SELECT id FROM updated), size_val
        FROM UNNEST(${sizes}::text[]) AS size_val
      ),
      removed_images AS (
        DELETE FROM public.product_images
        WHERE product_id = (SELECT id FROM updated)
      ),
      inserted_images AS (
        INSERT INTO public.product_images (product_id, url, public_id, sort_order)
        SELECT
          (SELECT id FROM updated),
          img.url,
          img.public_id,
          img.ord - 1
        FROM (
          SELECT
            UNNEST(${imagesWithIds.map((i) => i.url)}::text[]) AS url,
            UNNEST(${imagesWithIds.map((i) => i.publicId ?? null)}::text[]) AS public_id,
            GENERATE_SERIES(1, ${imagesWithIds.length}) AS ord
        ) AS img
      )
      SELECT id FROM updated
    `;

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = (err as Error).message ?? "Unable to update product";
    if (message.includes("products_slug_key")) {
      return NextResponse.json(
        { errors: { slug: "Slug must be unique" } },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id } = params;

  if (!uuidPattern.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    await ensurePublicIdColumn();
    const images = (await sql`
      SELECT public_id
      FROM public.product_images
      WHERE product_id = ${id}::uuid AND public_id IS NOT NULL
    `) as unknown as { public_id: string }[];

    for (const img of images) {
      if (img.public_id) {
        const result = await cloudinary.uploader.destroy(img.public_id);
        if (result.result !== "ok" && result.result !== "not found") {
          throw new Error(`Failed to delete image ${img.public_id} from Cloudinary`);
        }
      }
    }

    await sql`
      DELETE FROM public.product_sizes WHERE product_id = ${id}::uuid
    `;

    await sql`
      DELETE FROM public.product_images WHERE product_id = ${id}::uuid
    `;

    await sql`
      DELETE FROM public.products WHERE id = ${id}::uuid
    `;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Delete product failed", err);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
