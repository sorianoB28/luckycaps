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
        'Single Cap Big Box',
        10,
        10,
        8,
        8,
        'in',
        'oz',
        1,
        1,
        '["cap","hat","caps"]'::jsonb,
        'PDF_4x6'
      WHERE NOT EXISTS (
        SELECT 1 FROM public.parcel_templates WHERE name = 'Single Cap Big Box'
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
        WHERE name = 'Single Cap Big Box'
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
          WHERE name = 'Single Cap Big Box'
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
