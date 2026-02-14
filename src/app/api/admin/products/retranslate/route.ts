import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/adminAuth";
import sql from "@/lib/adminDb";
import { detectLanguage, translateText } from "@/lib/deeplClient";
import { detectInputLanguage } from "@/lib/productLanguage";
import { type Language } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ProductRow = {
  id: string;
  name: string;
  name_en?: string | null;
  name_es?: string | null;
  description?: string | null;
  description_en?: string | null;
  description_es?: string | null;
  translation_source_locale?: string | null;
  translated_at?: string | null;
};

const normalizeLocale = (val?: string | null): Language | null => {
  const up = (val ?? "").toUpperCase();
  return up === "EN" || up === "ES" ? (up as Language) : null;
};

const nowIso = () => new Date().toISOString();

export async function POST() {
  const { response } = await requireAdmin();
  if (response) return response;

  const rows = (await sql`
    SELECT
      id,
      name,
      name_en,
      name_es,
      description,
      description_en,
      description_es,
      translation_source_locale,
      translated_at
    FROM public.products
  `) as unknown as ProductRow[];

  const results: { id: string; updated: boolean; error?: string }[] = [];

  for (const row of rows) {
    try {
      const sourceDetected =
        normalizeLocale(row.translation_source_locale) ??
        (row.name_en && !row.name_es ? "EN" : null) ??
        (row.name_es && !row.name_en ? "ES" : null) ??
        (await detectLanguage(row.name || row.description || "")) ??
        detectInputLanguage({
          preferred: null,
          name: row.name,
          description: row.description ?? "",
        });

      const source: Language = sourceDetected === "ES" ? "ES" : "EN";
      const target: Language = source === "EN" ? "ES" : "EN";

      let name_en = row.name_en ?? (source === "EN" ? row.name : null);
      let name_es = row.name_es ?? (source === "ES" ? row.name : null);
      let description_en =
        row.description_en ?? (source === "EN" ? row.description : null);
      let description_es =
        row.description_es ?? (source === "ES" ? row.description : null);

      let translated = false;

      if (target === "ES" && (!name_es || !description_es)) {
        if (!name_es && row.name) {
          const tx = await translateText(row.name, target);
          if (tx) {
            name_es = tx;
            translated = true;
          }
        }
        if (!description_es && row.description) {
          const tx = await translateText(row.description, target);
          if (tx) {
            description_es = tx;
            translated = true;
          }
        }
      } else if (target === "EN" && (!name_en || !description_en)) {
        if (!name_en && row.name) {
          const tx = await translateText(row.name, target);
          if (tx) {
            name_en = tx;
            translated = true;
          }
        }
        if (!description_en && row.description) {
          const tx = await translateText(row.description, target);
          if (tx) {
            description_en = tx;
            translated = true;
          }
        }
      }

      // Ensure English legacy fields are set
      const legacyName = source === "ES" ? name_en ?? row.name : row.name;
      const legacyDescription =
        source === "ES" ? description_en ?? row.description : row.description;

      const translatedAt = translated
        ? nowIso()
        : row.translated_at ?? row.translation_source_locale
        ? row.translated_at
        : null;

      await sql`
        UPDATE public.products
        SET
          name = ${legacyName},
          description = ${legacyDescription},
          name_en = ${name_en},
          name_es = ${name_es},
          description_en = ${description_en},
          description_es = ${description_es},
          translation_source_locale = ${source.toLowerCase()},
          translated_at = ${translatedAt},
          translation_updated_at = ${translatedAt},
          updated_at = now()
        WHERE id = ${row.id}::uuid
      `;

      results.push({ id: row.id, updated: true });
    } catch (err) {
      results.push({
        id: row.id,
        updated: false,
        error: (err as Error).message ?? "unknown error",
      });
      console.warn("Product retranslate failed", {
        id: row.id,
        message: (err as Error).message,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    total: results.length,
    updated: results.filter((r) => r.updated).length,
    failed: results.filter((r) => !r.updated),
  });
}
