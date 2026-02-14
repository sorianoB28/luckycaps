import "server-only";

import { unstable_cache } from "next/cache";

import sql from "@/lib/db";
import {
  type DynamicCategory,
  normalizeCategoryKey,
  normalizeCategorySlug,
  sortDynamicCategories,
} from "@/lib/categories";

type CategoryRow = {
  category: string | null;
  count: number | string;
};

const readActiveProductCategories = unstable_cache(
  async (): Promise<DynamicCategory[]> => {
    const rows = (await sql`
      SELECT category, COUNT(*)::int AS count
      FROM public.products
      WHERE active = true
        AND category IS NOT NULL
        AND btrim(category) <> ''
      GROUP BY category
    `) as unknown as CategoryRow[];

    const bySlug = new Map<string, DynamicCategory>();

    rows.forEach((row) => {
      const slug = normalizeCategorySlug(row.category);
      if (!slug) return;

      const key = normalizeCategoryKey(row.category) || slug.replace(/\s+/g, "_");
      const count = Number.parseInt(String(row.count), 10);
      const existing = bySlug.get(slug);

      if (existing) {
        existing.count += Number.isFinite(count) ? count : 0;
        return;
      }

      bySlug.set(slug, {
        key,
        slug,
        count: Number.isFinite(count) ? count : 0,
      });
    });

    return sortDynamicCategories(Array.from(bySlug.values()));
  },
  ["active-product-categories"],
  { revalidate: 600, tags: ["categories"] }
);

/*
Sanity checklist:
1. Active categories in DB appear in footer "Shop" links and use /shop?category=<slug>.
2. Known categories follow preferred order; unknown categories are alphabetical.
3. If DB is unavailable or returns none, footer falls back to only "Shop All".
4. EN/ES label translations resolve from category keys in i18n.
*/
export async function getActiveProductCategories(): Promise<DynamicCategory[]> {
  try {
    return await readActiveProductCategories();
  } catch (err) {
    console.error("Failed to load active product categories", err);
    return [];
  }
}
