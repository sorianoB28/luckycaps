import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/adminAuth";
import sql from "@/lib/adminDb";
import { createShipmentDraft, type ShippoParcel } from "@/lib/shipping/shippo";

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

function normalizeShippoAddress(input: Record<string, unknown>) {
  const firstName = String(input.firstName ?? input.first_name ?? "").trim();
  const lastName = String(input.lastName ?? input.last_name ?? "").trim();
  const name =
    String(input.name ?? "").trim() || [firstName, lastName].filter(Boolean).join(" ");

  const street1 = String(input.street1 ?? input.address1 ?? "").trim();
  const street2 = String(input.street2 ?? input.address2 ?? "").trim() || null;
  const city = String(input.city ?? "").trim();
  const state = String(input.state ?? "").trim() || null;
  const zip = String(input.zip ?? input.postal_code ?? "").trim();
  const country = String(input.country ?? "").trim().toUpperCase();

  return {
    name: name || undefined,
    company: input.company ? String(input.company) : undefined,
    street1,
    street2,
    city,
    state,
    zip,
    country,
    phone: input.phone ? String(input.phone) : undefined,
    email: input.email ? String(input.email) : undefined,
  };
}

function normalizeParcel(input: Record<string, unknown> | null): ShippoParcel | null {
  if (!input) return null;
  const length = Number(input.length);
  const width = Number(input.width);
  const height = Number(input.height);
  const weight = Number(input.weight);
  const distance_unit = String(input.distance_unit || "");
  const mass_unit = String(input.mass_unit || "");

  if (![length, width, height, weight].every((value) => Number.isFinite(value) && value > 0)) {
    return null;
  }
  if (!distance_unit || !mass_unit) return null;

  return {
    length,
    width,
    height,
    weight,
    distance_unit,
    mass_unit,
  };
}

export async function POST(request: Request) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    let body: {
      recipient?: Record<string, unknown> | null;
      parcel?: Record<string, unknown> | null;
      label_format?: string | null;
    };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const shippingOrigin =
      (await getStoreSetting<Record<string, unknown>>("shipping_origin")) ?? null;
    if (!shippingOrigin) {
      return NextResponse.json({ error: "Missing shipping origin" }, { status: 400 });
    }

    const shipFrom = normalizeShippoAddress(shippingOrigin);
    const recipient = body.recipient ?? {};
    const shipTo = normalizeShippoAddress(recipient);
    const parcel = normalizeParcel(body.parcel ?? null);

    if (!shipFrom.street1 || !shipFrom.city || !shipFrom.zip || !shipFrom.country) {
      return NextResponse.json({ error: "Invalid shipping origin" }, { status: 400 });
    }
    if (!shipTo.street1 || !shipTo.city || !shipTo.zip || !shipTo.country) {
      return NextResponse.json({ error: "Invalid recipient address" }, { status: 400 });
    }
    if (!parcel) {
      return NextResponse.json({ error: "Missing parcel details" }, { status: 400 });
    }

    const shipmentDraft = await createShipmentDraft({
      ship_from: shipFrom,
      ship_to: shipTo,
      parcel,
    });

    const ratesJson = JSON.stringify(shipmentDraft.rates ?? []);
    const recipientJson = JSON.stringify(recipient);
    const parcelJson = JSON.stringify(parcel);
    const requestedFormat = String(body.label_format || "").trim();
    const labelFormat = requestedFormat === "ZPLII" ? "ZPLII" : "PDF_4x6";

    const rows = (await sql(
      `
        INSERT INTO public.manual_shipments (
          provider,
          status,
          recipient,
          parcel,
          rates,
          provider_shipment_id,
          label_format
        )
        VALUES ('shippo', 'rated', $1::jsonb, $2::jsonb, $3::jsonb, $4, $5)
        RETURNING *
      `,
      [recipientJson, parcelJson, ratesJson, shipmentDraft.provider_shipment_id, labelFormat]
    )) as Array<Record<string, unknown>>;

    const shipment = rows[0] ?? null;
    if (shipment) {
      shipment.recipient = parseJson(shipment.recipient, null);
      shipment.parcel = parseJson(shipment.parcel, null);
      shipment.rates = parseJson(shipment.rates, []);
      shipment.selected_rate = parseJson(shipment.selected_rate, null);
    }

    return NextResponse.json({
      shipment,
      rates: shipmentDraft.rates ?? [],
    });
  } catch (err) {
    console.error("Admin manual shipment draft failed", err);
    return NextResponse.json(
      { error: (err as Error).message || "Unable to create shipment draft" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
