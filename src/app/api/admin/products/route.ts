import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/adminAuth";
import sql from "@/lib/adminDb";
import { slugify } from "@/lib/slugify";
import { normalizeSize, sortSizes } from "@/lib/sizeOptions";
import { detectLanguage, translateText } from "@/lib/deeplClient";
import { detectInputLanguage } from "@/lib/productLanguage";
import { type Language } from "@/lib/i18n";

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

export async function GET(request: Request) {
  const { response } = await requireAdmin();
  if (response) return response;

  try {
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
      ORDER BY p.created_at DESC
    `) as unknown as AdminProductRow[];

    return NextResponse.json(rows);
  } catch (err) {
    console.error("Admin products GET failed", {
      message: (err as Error)?.message,
      error: err,
    });
    return NextResponse.json({ error: "admin_products_failed" }, { status: 500 });
  }
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

export async function POST(request: Request) {
  const { response } = await requireAdmin();
  if (response) return response;

  let payload: AdminProductPayload;
  try {
    payload = (await request.json()) as AdminProductPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const errors: Record<string, string> = {};

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

  let name_en = sourceLanguage === "EN" ? name : null;
  let name_es = sourceLanguage === "ES" ? name : null;
  let description_en = sourceLanguage === "EN" ? description : null;
  let description_es = sourceLanguage === "ES" ? description : null;
  let translationUpdatedAt: string | null = null;
  let translationSourceLocale: Language | null = null;
  let translatedAt: string | null = null;

  const targetLang = sourceLanguage === "EN" ? "ES" : "EN";
  const needsTranslation =
    targetLang === "ES"
      ? !name_es || !description_es
      : !name_en || !description_en;

  if (needsTranslation) {
    const translatedName = name ? await translateText(name, targetLang) : null;
    const translatedDescription = description
      ? await translateText(description, targetLang)
      : null;

    if (targetLang === "ES") {
      if (!name_es && translatedName) name_es = translatedName;
      if (!description_es && translatedDescription) description_es = translatedDescription;
    } else {
      if (!name_en && translatedName) name_en = translatedName;
      if (!description_en && translatedDescription) description_en = translatedDescription;
    }

    if (translatedName || translatedDescription) {
      translationUpdatedAt = new Date().toISOString();
      translationSourceLocale = sourceLanguage;
      translatedAt = translationUpdatedAt;
    } else {
      console.warn("DeepL translation missing, saving originals only");
    }
  }

  const baseName = sourceLanguage === "ES" ? name_en ?? name : name;
  const baseDescription = sourceLanguage === "ES" ? description_en ?? description : description;
  // best-effort fallback when translation failed
  if (!name_en) name_en = name;
  if (!description_en) description_en = description;
  const translationSourceLower =
    translationSourceLocale?.toLowerCase() === "es"
      ? "es"
      : translationSourceLocale?.toLowerCase() === "en"
      ? "en"
      : null;
  const isSale = Boolean(payload.isSale);
  const isNewDrop = Boolean(payload.isNewDrop);
  const stock = Number(payload.stock ?? 0);
  const priceCents = centsFromNumber(payload.price);
  const salePriceCents = isSale ? centsFromNumber(payload.salePrice ?? payload.price) : null;
  const originalPriceCents = isSale
    ? centsFromNumber(payload.originalPrice ?? payload.price ?? payload.salePrice)
    : centsFromNumber(payload.originalPrice);
  const images = normalizeImages(payload.images);
  const active = payload.active ?? true;
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

    const inserted = (await sql`
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
        translation_source_locale,
        translated_at,
        translation_updated_at
      )
      VALUES (
        ${slug},
        ${baseName},
        ${name_en},
        ${name_es},
        ${category},
        ${baseDescription},
        ${description_en},
        ${description_es},
        ${priceCents},
        ${salePriceCents},
        ${originalPriceCents},
        ${isNewDrop},
        ${isSale},
        ${[]}::text[],
        ${[]}::text[],
        ${stock},
        ${active},
        ${translationSourceLower},
        ${translatedAt ?? translationUpdatedAt},
        ${translatedAt ?? translationUpdatedAt}
      )
      RETURNING id
    `) as unknown as { id: string }[];

    const productId = inserted[0]?.id;

    if (sizes.length) {
      await sql`
        INSERT INTO public.product_sizes (product_id, name)
        SELECT ${productId}, size_val
        FROM UNNEST(${sizes}::text[]) AS size_val
      `;
    }

    if (images.length) {
      await sql`
        INSERT INTO public.product_images (product_id, url, public_id, sort_order)
        SELECT
          ${productId},
          img.url,
          img.public_id,
          img.ord - 1
        FROM (
          SELECT
            UNNEST(${images.map((i) => i.url)}::text[]) AS url,
            UNNEST(${images.map((i) => i.publicId)}::text[]) AS public_id,
            GENERATE_SERIES(1, ${images.length}) AS ord
        ) AS img
      `;
    }

    return NextResponse.json({ productId }, { status: 201 });
  } catch (err) {
    const message = (err as Error).message ?? "Unable to create product";
    if (message.includes("products_slug_key")) {
      return NextResponse.json(
        { errors: { slug: "Slug must be unique" } },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: message || "Failed to create product" }, { status: 500 });
  }
}
