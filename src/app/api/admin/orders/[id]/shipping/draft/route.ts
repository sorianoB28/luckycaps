import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/adminAuth";
import sql from "@/lib/adminDb";
import { createShipmentDraft, type ShippoParcel } from "@/lib/shipping/shippo";

const isUuid = (value: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    value
  );

const allowedStatuses = new Set(["paid", "shipped", "delivered"]);

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
  const country = String(input.country ?? "").trim();

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

    let body: {
      parcel?: Record<string, unknown> | null;
      parcel_template_id?: string | null;
    };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const orderRows = (await sql(
      `
        SELECT id, status, email, contact, shipping_address
        FROM public.orders
        WHERE id = $1::uuid
        LIMIT 1
      `,
      [params.id]
    )) as Array<{
      id: string;
      status: string;
      email: string | null;
      contact: Record<string, unknown> | null;
      shipping_address: Record<string, unknown> | null;
    }>;

    const order = orderRows[0];
    if (!order) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!allowedStatuses.has(order.status)) {
      return NextResponse.json({ error: "Order not eligible for shipping" }, { status: 400 });
    }

    const shippingOrigin =
      (await getStoreSetting<Record<string, unknown>>("shipping_origin")) ?? null;
    if (!shippingOrigin) {
      return NextResponse.json({ error: "Missing shipping origin" }, { status: 400 });
    }

    const shipFrom = normalizeShippoAddress(shippingOrigin);
    const shipToRaw = order.shipping_address ?? {};
    const shipTo = normalizeShippoAddress({
      ...shipToRaw,
      email: order.email,
      phone: order.contact?.phone,
    });

    if (!shipFrom.street1 || !shipFrom.city || !shipFrom.zip || !shipFrom.country) {
      return NextResponse.json({ error: "Invalid shipping origin" }, { status: 400 });
    }
    if (!shipTo.street1 || !shipTo.city || !shipTo.zip || !shipTo.country) {
      return NextResponse.json({ error: "Invalid shipping address" }, { status: 400 });
    }

    let parcel = normalizeParcel(body.parcel ?? null);
    let selectedTemplateId: string | null = body.parcel_template_id
      ? String(body.parcel_template_id)
      : null;

    if (!parcel && body.parcel_template_id) {
      const templateRows = (await sql(
        `
          SELECT
            length,
            width,
            height,
            weight,
            distance_unit,
            mass_unit
          FROM public.parcel_templates
          WHERE id = $1::uuid
          LIMIT 1
        `,
        [body.parcel_template_id]
      )) as Array<Record<string, unknown>>;
      parcel = normalizeParcel(templateRows[0] ?? null);
      if (!parcel) {
        selectedTemplateId = null;
      }
    }

    if (!parcel) {
      const defaults = await getStoreSetting<Record<string, unknown>>("shipping_defaults");
      const defaultTemplateId = defaults?.default_parcel_template_id as string | undefined;
      if (defaultTemplateId) {
        const templateRows = (await sql(
          `
            SELECT
              length,
              width,
              height,
              weight,
              distance_unit,
              mass_unit
            FROM public.parcel_templates
            WHERE id = $1::uuid
            LIMIT 1
          `,
          [defaultTemplateId]
        )) as Array<Record<string, unknown>>;
        parcel = normalizeParcel(templateRows[0] ?? null);
        if (parcel) {
          selectedTemplateId = defaultTemplateId;
        }
      }
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
    const parcelJson = JSON.stringify(parcel);

    const updatedRows = (await sql(
      `
        INSERT INTO public.shipments (
          order_id,
          provider,
          status,
          provider_shipment_id,
          parcel_template_id,
          parcel,
          rates
        )
        VALUES ($1::uuid, 'shippo', 'rated', $2, $3::uuid, $4::jsonb, $5::jsonb)
        ON CONFLICT (order_id)
        DO UPDATE
        SET
          status = 'rated',
          provider_shipment_id = EXCLUDED.provider_shipment_id,
          parcel_template_id = EXCLUDED.parcel_template_id,
          parcel = EXCLUDED.parcel,
          rates = EXCLUDED.rates
        RETURNING *
      `,
      [
        params.id,
        shipmentDraft.provider_shipment_id,
        selectedTemplateId,
        parcelJson,
        ratesJson,
      ]
    )) as Array<Record<string, unknown>>;

    const shipment = updatedRows[0] ?? null;
    if (shipment) {
      shipment.parcel = parseJson(shipment.parcel, null);
      shipment.rates = parseJson(shipment.rates, []);
    }

    return NextResponse.json({
      shipment,
      rates: shipmentDraft.rates ?? [],
    });
  } catch (err) {
    console.error("Admin shipping draft failed", err);
    return NextResponse.json(
      { error: (err as Error).message || "Unable to create shipment draft" },
      { status: 200 }
    );
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
