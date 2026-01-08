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

    const shipment = shipmentRows[0] ?? null;
    const rates = parseJson(shipment?.rates, []) as Array<Record<string, unknown>>;
    const parcel = parseJson(shipment?.parcel, null) as Record<string, unknown> | null;

    if (shipment) {
      shipment.rates = rates;
      shipment.parcel = parcel;
    }

    const templates = (await sql(
      `
        SELECT
          id,
          name,
          length_in AS length,
          width_in AS width,
          height_in AS height,
          weight_oz AS weight,
          'in' AS distance_unit,
          'oz' AS mass_unit
        FROM public.parcel_templates
        ORDER BY name ASC
      `
    )) as Array<Record<string, unknown>>;

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
      { error: "Unable to load shipping data" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
