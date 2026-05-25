import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/adminAuth";
import sql from "@/lib/adminDb";

const isUuid = (value: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    value
  );

const parseJson = <T,>(value: unknown, fallback: T) => {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
};

async function getStoreSetting<T>(key: string) {
  const rows = (await sql(
    `
      SELECT value
      FROM public.store_settings
      WHERE key = $1
      LIMIT 1
    `,
    [key]
  )) as Array<{ value: T }>;
  return rows[0]?.value ?? null;
}

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

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    if (!params.id || !isUuid(params.id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const shipmentRows = (await sql(
      `
        SELECT *
        FROM public.shipments
        WHERE order_id = $1::uuid
        LIMIT 1
      `,
      [params.id]
    )) as Array<Record<string, unknown>>;

    let shipment = shipmentRows[0] ?? null;
    if (!shipment) {
      const createdRows = (await sql(
        `
          INSERT INTO public.shipments (order_id, provider, status, rates)
          VALUES ($1::uuid, 'shippo', 'draft', '[]'::jsonb)
          ON CONFLICT (order_id) DO NOTHING
          RETURNING *
        `,
        [params.id]
      )) as Array<Record<string, unknown>>;
      shipment = createdRows[0] ?? null;
    }

    const rates = parseJson(shipment?.rates, []) as Array<Record<string, unknown>>;
    const parcel = parseJson(shipment?.parcel, null) as Record<string, unknown> | null;
    const selectedRate = parseJson(shipment?.selected_rate, null) as
      | Record<string, unknown>
      | null;

    if (shipment) {
      shipment.rates = rates;
      shipment.parcel = parcel;
      shipment.selected_rate = selectedRate;
    }

    let templates = (await sql(
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

    if (templates.length === 0) {
      await seedParcelTemplates();
      templates = (await sql(
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

    const defaults = await getStoreSetting<Record<string, unknown>>("shipping_defaults");
    const templateNotice =
      templates.length === 0
        ? "No parcel templates configured yet. Add one to enable rate quotes."
        : null;

    return NextResponse.json({
      shipment: shipment ?? null,
      rates,
      parcel_templates: templates,
      defaults,
      template_notice: templateNotice,
    });
  } catch (err) {
    console.error("Admin shipping fetch failed", err);
    return NextResponse.json(
      { error: (err as Error).message || "Unable to load shipping data" },
      { status: 200 }
    );
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
