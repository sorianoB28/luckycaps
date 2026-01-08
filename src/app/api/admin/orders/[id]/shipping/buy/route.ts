import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/adminAuth";
import sql from "@/lib/adminDb";
import { buyLabel } from "@/lib/shipping/shippo";

const isUuid = (value: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    value
  );

const allowedLabelFormats = new Set(["PDF_4x6", "ZPLII"]);

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

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    if (!params.id || !isUuid(params.id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    let body: { rate_id?: string; label_format?: string };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const rateId = String(body.rate_id || "").trim();
    if (!rateId) {
      return NextResponse.json({ error: "Missing rate id" }, { status: 400 });
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
    if (!shipment) {
      return NextResponse.json({ error: "Missing shipment" }, { status: 404 });
    }
    if (shipment.status === "purchased") {
      return NextResponse.json(
        { error: "Label already purchased", shipment },
        { status: 400 }
      );
    }

    const rates = parseJson(shipment.rates, []) as Array<{ id?: string }>;
    const match = rates.find((rate) => String(rate.id) === rateId);
    if (!match) {
      return NextResponse.json({ error: "Rate not found" }, { status: 400 });
    }

    let labelFormat = String(body.label_format || "").trim();
    if (!labelFormat) {
      const defaults = await getStoreSetting<Record<string, unknown>>("shipping_defaults");
      labelFormat = String(defaults?.label_format || "");
    }
    if (!allowedLabelFormats.has(labelFormat)) {
      labelFormat = "PDF_4x6";
    }

    const purchase = await buyLabel({ rate_id: rateId, label_format: labelFormat });

    const updatedRows = (await sql(
      `
        UPDATE public.shipments
        SET
          status = 'purchased',
          provider_rate_id = $2,
          label_url = $3,
          tracking_number = $4,
          tracking_url = $5,
          postage_amount = $6,
          label_format = $7
        WHERE order_id = $1::uuid
        RETURNING *
      `,
      [
        params.id,
        rateId,
        purchase.label_url,
        purchase.tracking_number,
        purchase.tracking_url,
        purchase.postage_amount,
        labelFormat,
      ]
    )) as Array<Record<string, unknown>>;

    const updated = updatedRows[0] ?? shipment;
    updated.rates = parseJson(updated.rates, []);
    updated.parcel = parseJson(updated.parcel, null);

    return NextResponse.json({
      shipment: updated,
    });
  } catch (err) {
    console.error("Admin shipping purchase failed", err);
    return NextResponse.json(
      { error: (err as Error).message || "Unable to purchase label" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
