import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/adminAuth";
import sql from "@/lib/adminDb";
import { slugify } from "@/lib/slugify";
import { cloudinary } from "@/lib/cloudinary";
import { normalizeSize, sortSizes } from "@/lib/sizeOptions";
import { detectLanguage, translateText } from "@/lib/deeplClient";
import { detectInputLanguage } from "@/lib/productLanguage";
import { type Language } from "@/lib/i18n";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function ensurePublicIdColumn() {
  await sql`
    ALTER TABLE public.product_images
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
  created_at: string;
  translation_updated_at?: string | null;
  translation_source_locale?: Language | null;
  translated_at?: string | null;
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
      p.created_at,
      p.translation_updated_at,
      p.translation_source_locale,
      p.translated_at,
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
  sourceLanguage?: Language;
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
    SELECT
      active,
      name,
      name_en,
      name_es,
      description,
      description_en,
      description_es,
      translation_updated_at,
      translation_source_locale,
      translated_at
    FROM public.products
    WHERE id = ${id}::uuid
    LIMIT 1
  `) as unknown as {
    active: boolean;
    name: string;
    name_en?: string | null;
    name_es?: string | null;
    description: string;
    description_en?: string | null;
    description_es?: string | null;
    translation_updated_at?: string | null;
    translation_source_locale?: Language | null;
    translated_at?: string | null;
  }[];

  if (!existingRows.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const name = payload.name?.trim() ?? "";
  const slug = slugify(payload.slug?.trim() || name);
  const category = (payload.category ?? "").trim().toLowerCase();
  const description = payload.description?.trim() ?? "";
  const preferredLanguage =
    payload.sourceLanguage === "EN" || payload.sourceLanguage === "ES"
      ? payload.sourceLanguage
      : undefined;
  const deeplDetected = await detectLanguage(name || description);
  const sourceLanguage =
    preferredLanguage ??
    deeplDetected ??
    detectInputLanguage({
      preferred: preferredLanguage,
      name,
      description,
    });

  const previousNameEn = existingRows[0].name_en ?? existingRows[0].name ?? "";
  const previousNameEs = existingRows[0].name_es ?? existingRows[0].name ?? "";
  const previousDescriptionEn =
    existingRows[0].description_en ?? existingRows[0].description ?? "";
  const previousDescriptionEs =
    existingRows[0].description_es ?? existingRows[0].description ?? "";

  let name_en = sourceLanguage === "EN" ? name : existingRows[0].name_en ?? null;
  let name_es = sourceLanguage === "ES" ? name : existingRows[0].name_es ?? null;
  let description_en =
    sourceLanguage === "EN" ? description : existingRows[0].description_en ?? null;
  let description_es =
    sourceLanguage === "ES" ? description : existingRows[0].description_es ?? null;
  let translationUpdatedAt =
    existingRows[0].translated_at ?? existingRows[0].translation_updated_at ?? null;
  let translationSourceLocale = existingRows[0].translation_source_locale ?? null;
  let translatedAt = existingRows[0].translated_at ?? existingRows[0].translation_updated_at ?? null;

  const sourceChanged =
    sourceLanguage === "EN"
      ? name !== previousNameEn || description !== previousDescriptionEn
      : name !== previousNameEs || description !== previousDescriptionEs;

  const targetMissing =
    sourceLanguage === "EN"
      ? !previousNameEs || !previousDescriptionEs
      : !previousNameEn || !previousDescriptionEn;

  const targetLang = sourceLanguage === "EN" ? "ES" : "EN";

  if (targetMissing || sourceChanged) {
    const translatedName = name ? await translateText(name, targetLang) : null;
    const translatedDescription = description
      ? await translateText(description, targetLang)
      : null;

    if (targetLang === "ES") {
      if (translatedName) name_es = translatedName;
      if (translatedDescription) description_es = translatedDescription;
    } else {
      if (translatedName) name_en = translatedName;
      if (translatedDescription) description_en = translatedDescription;
    }

    if (translatedName || translatedDescription) {
      translationUpdatedAt = new Date().toISOString();
      translationSourceLocale = sourceLanguage;
      translatedAt = translationUpdatedAt;
    } else {
      console.warn("DeepL translation missing on update, saving originals only", {
        id,
        targetLang,
      });
    }
  }
  // best-effort fallback to keep English-facing fields populated
  if (!name_en) name_en = name;
  if (!description_en) description_en = description;
  const translationSourceLower =
    translationSourceLocale?.toLowerCase() === "es"
      ? "es"
      : translationSourceLocale?.toLowerCase() === "en"
      ? "en"
      : null;
  const baseName = sourceLanguage === "ES" ? name_en ?? name : name;
  const baseDescription = sourceLanguage === "ES" ? description_en ?? description : description;
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
      .filter((s): s is NonNullable<typeof s> => Boolean(s))
      .filter((s, idx, arr) => arr.indexOf(s) === idx)
  );

  if (!name) {
    errors.name = "Name is required";
  }
  if (!slug) {
    errors.slug = "Slug is required";
  }
  if (!category) {
    errors.category = "Category is required";
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
          name = ${baseName},
          name_en = ${name_en},
          name_es = ${name_es},
          category = ${category},
          description = ${baseDescription},
          description_en = ${description_en},
          description_es = ${description_es},
          price_cents = ${priceCents},
          sale_price_cents = ${salePriceCents},
          original_price_cents = ${originalPriceCents},
          is_new_drop = ${isNewDrop},
          is_sale = ${isSale},
          stock = ${stock},
          active = ${active},
          translation_source_locale = ${translationSourceLower},
          translated_at = ${translatedAt ?? translationUpdatedAt},
          translation_updated_at = ${translatedAt ?? translationUpdatedAt},
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
        ON CONFLICT (product_id, name) DO NOTHING
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
        ON CONFLICT (product_id, sort_order) DO UPDATE
        SET url = EXCLUDED.url, public_id = EXCLUDED.public_id
      )
      SELECT id FROM updated
    `;

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = (err as Error).message ?? "Unable to update product";
    console.error("Admin update product failed", { id, message, error: err });
    if (message.includes("products_slug_key")) {
      return NextResponse.json(
        { errors: { slug: "Slug must be unique" } },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: message || "Failed to update product" }, { status: 500 });
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
