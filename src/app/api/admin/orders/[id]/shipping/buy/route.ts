import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/adminAuth";
import sql from "@/lib/adminDb";
import { uploadLabelToCloudinary } from "@/lib/shipping/labelStorage";
import { buyLabel, fetchTransactionLabelUrl } from "@/lib/shipping/shippo";

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
    const selectedRateJson = JSON.stringify(match);
    const postageCurrency =
      purchase.postage_currency || (typeof match.currency === "string" ? match.currency : null);
    let labelAssetUrl: string | null = null;
    let labelAssetPublicId: string | null = null;
    let labelError: string | null = null;
    let labelErrorCode: string | null = null;
    const shipmentId = typeof shipment.id === "string" ? shipment.id : "";
    const labelPublicId = `labels/${params.id}/${
      shipmentId || purchase.transaction_id || rateId
    }`;
    const archiveLabel = async (labelUrl: string, source: string) => {
      const upload = await uploadLabelToCloudinary({
        label_url: labelUrl,
        public_id: labelPublicId,
        folder: null,
      });
      labelAssetUrl = upload.asset_url;
      labelAssetPublicId = upload.public_id;
      if (!labelAssetUrl) {
        throw new Error(`Cloudinary upload failed (${source})`);
      }
    };

    if (purchase.label_url) {
      try {
        await archiveLabel(purchase.label_url, "shippo_label_url");
      } catch (err) {
        labelError = (err as Error).message || "Unable to store shipping label";
        labelErrorCode = "cloudinary_upload_failed";
        console.error("Label archive failed", {
          code: labelErrorCode,
          order_id: params.id,
          error: labelError,
        });
      }
    } else {
      labelError = "Shippo label URL missing";
      labelErrorCode = "shippo_label_missing";
      console.error("Label archive failed", {
        code: labelErrorCode,
        order_id: params.id,
        error: labelError,
      });
    }

    if (!labelAssetUrl && purchase.transaction_id) {
      try {
        const fallbackUrl = await fetchTransactionLabelUrl(purchase.transaction_id);
        await archiveLabel(fallbackUrl, "shippo_transaction");
        labelError = null;
        labelErrorCode = null;
      } catch (err) {
        const message = (err as Error).message || "Unable to fetch Shippo label";
        console.error("Label archive fallback failed", {
          code: "shippo_label_fetch_failed",
          order_id: params.id,
          error: message,
        });
        if (!labelError) {
          labelError = message;
          labelErrorCode = "shippo_label_fetch_failed";
        }
      }
    }

    const updatedRows = (await sql(
      `
        INSERT INTO public.shipments (
          order_id,
          provider,
          status,
          provider_rate_id,
          label_url,
          tracking_number,
          tracking_url,
          postage_amount,
          postage_currency,
          label_format,
          selected_rate,
          shippo_transaction_id,
          label_asset_url,
          label_asset_provider,
          label_asset_public_id,
          label_purchased_at,
          parcel_template_id,
          parcel
        )
        VALUES (
          $1::uuid,
          'shippo',
          'purchased',
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9::jsonb,
          $10,
          $11,
          $12,
          $13,
          now(),
          $14::uuid,
          $15::jsonb
        )
        ON CONFLICT (order_id)
        DO UPDATE
        SET
          status = 'purchased',
          provider_rate_id = EXCLUDED.provider_rate_id,
          label_url = EXCLUDED.label_url,
          tracking_number = EXCLUDED.tracking_number,
          tracking_url = EXCLUDED.tracking_url,
          postage_amount = EXCLUDED.postage_amount,
          postage_currency = EXCLUDED.postage_currency,
          label_format = EXCLUDED.label_format,
          selected_rate = EXCLUDED.selected_rate,
          shippo_transaction_id = EXCLUDED.shippo_transaction_id,
          label_asset_url = COALESCE(EXCLUDED.label_asset_url, shipments.label_asset_url),
          label_asset_provider = COALESCE(EXCLUDED.label_asset_provider, shipments.label_asset_provider),
          label_asset_public_id = COALESCE(EXCLUDED.label_asset_public_id, shipments.label_asset_public_id),
          label_purchased_at = COALESCE(shipments.label_purchased_at, EXCLUDED.label_purchased_at),
          parcel_template_id = COALESCE(shipments.parcel_template_id, EXCLUDED.parcel_template_id),
          parcel = COALESCE(shipments.parcel, EXCLUDED.parcel)
        RETURNING *
      `,
      [
        params.id,
        rateId,
        purchase.label_url,
        purchase.tracking_number,
        purchase.tracking_url,
        purchase.postage_amount,
        postageCurrency,
        labelFormat,
        selectedRateJson,
        purchase.transaction_id || null,
        labelAssetUrl,
        labelAssetUrl ? "cloudinary" : null,
        labelAssetPublicId,
        typeof shipment.parcel_template_id === "string" ? shipment.parcel_template_id : null,
        shipment.parcel ?? null,
      ]
    )) as Array<Record<string, unknown>>;

    const updated = updatedRows[0] ?? shipment;
    updated.rates = parseJson(updated.rates, []);
    updated.parcel = parseJson(updated.parcel, null);
    updated.selected_rate = parseJson(updated.selected_rate, null);

    const payload: {
      shipment: typeof updated;
      label_error?: string;
      label_error_code?: string;
    } = { shipment: updated };
    if (labelError) {
      payload.label_error = labelError;
      if (labelErrorCode) payload.label_error_code = labelErrorCode;
    }

    return NextResponse.json(payload);
  } catch (err) {
    const message = (err as Error).message || "Unable to purchase label";
    const code = message.includes("Missing Shippo API token")
      ? "shippo_token_missing"
      : "shippo_purchase_failed";
    console.error("Admin shipping purchase failed", {
      code,
      order_id: params.id,
      error: message,
    });
    return NextResponse.json(
      { error: message, code },
      { status: 200 }
    );
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
