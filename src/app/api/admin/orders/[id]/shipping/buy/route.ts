import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/adminAuth";
import sql from "@/lib/adminDb";
import { uploadLabelToCloudinary } from "@/lib/shipping/labelStorage";
import {
  buyLabel,
  fetchTransactionLabelUrl,
  ShippoTransactionError,
  type ShippoDiagnosticMessage,
} from "@/lib/shipping/shippo";

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

type ShipmentRecord = Record<string, unknown> & {
  id?: unknown;
  status?: unknown;
  rates?: unknown;
  parcel?: unknown;
  selected_rate?: unknown;
  parcel_template_id?: unknown;
  label_url?: unknown;
  tracking_number?: unknown;
  tracking_url?: unknown;
  postage_amount?: unknown;
  postage_currency?: unknown;
  label_asset_url?: unknown;
};

const readString = (value: unknown) =>
  typeof value === "string" ? value : value == null ? "" : String(value);

const hasValue = (value: unknown) => readString(value).trim().length > 0;

const normalizeShipment = (shipment: ShipmentRecord | null): ShipmentRecord | null => {
  if (!shipment) return null;

  return {
    ...shipment,
    rates: parseJson(shipment.rates, []),
    parcel: parseJson(shipment.parcel, null),
    selected_rate: parseJson(shipment.selected_rate, null),
  };
};

const PURCHASE_FIELD_NAMES = [
  "label_url",
  "tracking_number",
  "tracking_url",
  "postage_amount",
  "postage_currency",
  "provider_rate_id",
  "shippo_transaction_id",
  "label_purchased_at",
] as const;

function buildProviderSummary(messages: ShippoDiagnosticMessage[]) {
  if (!messages.length) return null;

  return messages
    .map((message) => {
      const prefix = [message.code, message.source].filter(Boolean).join(" / ");
      return prefix ? `${prefix}: ${message.text}` : message.text;
    })
    .join(" | ");
}

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
  let shipment: ShipmentRecord | null = null;

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
    )) as ShipmentRecord[];

    shipment = shipmentRows[0] ?? null;
    if (!shipment) {
      const createdRows = (await sql(
        `
          INSERT INTO public.shipments (order_id, provider, status, rates)
          VALUES ($1::uuid, 'shippo', 'draft', '[]'::jsonb)
          ON CONFLICT (order_id) DO NOTHING
          RETURNING *
        `,
        [params.id]
      )) as ShipmentRecord[];
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

    type RateLike = {
      id?: string;
      amount?: string | number | null;
      currency?: string | null;
      currency_code?: string | null;
      currency_local?: string | null;
    };

    const rates = parseJson(shipment.rates, []) as RateLike[];
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
    const rateAmount = Number(match.amount);
    const rateCurrency =
      (typeof match.currency === "string" && match.currency) ||
      (typeof match.currency_code === "string" && match.currency_code) ||
      (typeof match.currency_local === "string" && match.currency_local) ||
      null;
    const postageAmount =
      purchase.postage_amount != null && Number.isFinite(Number(purchase.postage_amount))
        ? Number(purchase.postage_amount)
        : Number.isFinite(rateAmount)
        ? rateAmount
        : null;
    const postageCurrency = purchase.postage_currency || rateCurrency;
    let labelAssetUrl: string | null = null;
    let labelAssetPublicId: string | null = null;
    let labelError: string | null = null;
    let labelErrorCode: string | null = null;
    let persistedLabelUrl = readString(purchase.label_url).trim() || null;
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

    if (persistedLabelUrl) {
      try {
        await archiveLabel(persistedLabelUrl, "shippo_label_url");
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

    if ((!labelAssetUrl || !persistedLabelUrl) && purchase.transaction_id) {
      let fetchedFallbackUrl = false;
      try {
        const fallbackUrl = await fetchTransactionLabelUrl(purchase.transaction_id);
        fetchedFallbackUrl = true;
        if (!persistedLabelUrl) {
          persistedLabelUrl = fallbackUrl;
        }
        labelError = null;
        labelErrorCode = null;
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
        if (fetchedFallbackUrl || !labelError) {
          labelError = message;
          labelErrorCode = fetchedFallbackUrl
            ? "cloudinary_upload_failed"
            : "shippo_label_fetch_failed";
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
        persistedLabelUrl,
        purchase.tracking_number,
        purchase.tracking_url,
        postageAmount,
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
    )) as ShipmentRecord[];

    const updated = normalizeShipment(updatedRows[0] ?? shipment) ?? shipment;

    const payload: {
      shipment: typeof updated;
      label_error?: string;
      label_error_code?: string;
    } = { shipment: updated };
    if (labelError) {
      payload.label_error = labelError;
      if (labelErrorCode) payload.label_error_code = labelErrorCode;
    }

    console.info("Admin shipping purchase persisted", {
      order_id: params.id,
      provider_rate_id: rateId,
      shippo_transaction_id: readString(purchase.transaction_id).trim() || null,
      label_url_persisted: hasValue(updated?.label_url),
      tracking_number_persisted: hasValue(updated?.tracking_number),
      tracking_url_persisted: hasValue(updated?.tracking_url),
      postage_amount_persisted:
        updated?.postage_amount != null && Number.isFinite(Number(updated.postage_amount)),
      postage_currency_persisted: hasValue(updated?.postage_currency),
      label_asset_url_persisted: hasValue(updated?.label_asset_url),
      label_archive_error_code: labelErrorCode,
    });

    return NextResponse.json(payload);
  } catch (err) {
    const message = (err as Error).message || "Unable to purchase label";
    const currentShipment = normalizeShipment(shipment);

    if (err instanceof ShippoTransactionError) {
      const providerSummary = buildProviderSummary(err.shippoMessages) || message;
      console.error("Admin shipping provider purchase failed", {
        code: "shippo_purchase_failed",
        order_id: params.id,
        shippo_status: err.shippoStatus,
        shippo_object_state: err.shippoObjectState,
        shippo_transaction_id: err.shippoTransactionId,
        provider_messages: err.shippoMessages,
      });

      return NextResponse.json(
        {
          error: message,
          code: "shippo_purchase_failed",
          provider_error_summary: providerSummary,
          provider_messages: err.shippoMessages,
          provider_status: err.shippoStatus,
          provider_object_state: err.shippoObjectState,
          shippo_transaction_id: err.shippoTransactionId,
          label_created: false,
          shipment_persisted: false,
          persisted_fields: [],
          missing_fields: [...PURCHASE_FIELD_NAMES],
          shipment: currentShipment,
        },
        { status: 422 }
      );
    }

    const code =
      message.includes("SHIPPO_API_TOKEN") || message.includes("SHIPPO_TEST_TOKEN")
      ? "shippo_token_missing"
      : "shippo_purchase_failed";
    console.error("Admin shipping purchase failed", {
      code,
      order_id: params.id,
      error: message,
    });
    return NextResponse.json(
      {
        error: message,
        code,
        label_created: false,
        shipment_persisted: false,
        persisted_fields: [],
        missing_fields: [...PURCHASE_FIELD_NAMES],
        shipment: currentShipment,
      },
      { status: code === "shippo_token_missing" ? 500 : 502 }
    );
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
