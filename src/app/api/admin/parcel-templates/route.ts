import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/adminAuth";
import sql from "@/lib/adminDb";

async function seedParcelTemplates() {
  await sql(
    `
      INSERT INTO public.parcel_templates (
        name,
        length,
        width,
        height,
        weight,
        distance_unit,
        mass_unit,
        min_items,
        max_items,
        tags,
        label_format_default
      )
      SELECT
        'Cap - Single',
        8,
        8,
        4,
        8,
        'in',
        'oz',
        1,
        1,
        '["cap","hat","caps"]'::jsonb,
        'PDF_4x6'
      WHERE NOT EXISTS (
        SELECT 1 FROM public.parcel_templates WHERE name = 'Cap - Single'
      )
      UNION ALL
      SELECT
        'Cap - 2 hats',
        10,
        8,
        6,
        16,
        'in',
        'oz',
        2,
        2,
        '["cap","hat","caps"]'::jsonb,
        'PDF_4x6'
      WHERE NOT EXISTS (
        SELECT 1 FROM public.parcel_templates WHERE name = 'Cap - 2 hats'
      )
      UNION ALL
      SELECT
        'Cap - 3-4 hats',
        12,
        10,
        8,
        32,
        'in',
        'oz',
        3,
        4,
        '["cap","hat","caps"]'::jsonb,
        'PDF_4x6'
      WHERE NOT EXISTS (
        SELECT 1 FROM public.parcel_templates WHERE name = 'Cap - 3-4 hats'
      )
      UNION ALL
      SELECT
        'Soft goods mailer',
        10,
        13,
        2,
        12,
        'in',
        'oz',
        1,
        4,
        '["soft","softgoods","apparel","shirt","hoodie"]'::jsonb,
        'PDF_4x6'
      WHERE NOT EXISTS (
        SELECT 1 FROM public.parcel_templates WHERE name = 'Soft goods mailer'
      )
    `
  );
}

export async function GET() {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    let rows = (await sql(
      `
        SELECT
          id,
          name,
          length,
          width,
          height,
          weight,
          distance_unit,
          mass_unit,
          min_items,
          max_items,
          tags,
          label_format_default
        FROM public.parcel_templates
        ORDER BY name ASC
      `
    )) as Array<Record<string, unknown>>;

    if (rows.length === 0) {
      await seedParcelTemplates();
      rows = (await sql(
        `
          SELECT
            id,
            name,
            length,
            width,
            height,
            weight,
            distance_unit,
            mass_unit,
            min_items,
            max_items,
            tags,
            label_format_default
          FROM public.parcel_templates
          ORDER BY name ASC
        `
      )) as Array<Record<string, unknown>>;
    }

    return NextResponse.json({ templates: rows });
  } catch (err) {
    console.error("Admin parcel templates fetch failed", err);
    return NextResponse.json(
      { error: (err as Error).message || "Unable to load parcel templates" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
