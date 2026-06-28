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
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);

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

type ManualShipmentRecord = Record<string, unknown> & {
  id?: unknown;
  status?: unknown;
  rates?: unknown;
  label_url?: unknown;
  tracking_number?: unknown;
  tracking_url?: unknown;
  postage_amount?: unknown;
  postage_currency?: unknown;
  label_asset_url?: unknown;
};

const readString = (value: unknown) =>
  typeof value === "string" ? value : value == null ? "" : String(value);

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

const normalizeShipment = (shipment: ManualShipmentRecord | null): ManualShipmentRecord | null => {
  if (!shipment) return null;
  return {
    ...shipment,
    recipient: parseJson(shipment.recipient, null),
    parcel: parseJson(shipment.parcel, null),
    rates: parseJson(shipment.rates, []),
    selected_rate: parseJson(shipment.selected_rate, null),
  };
};

function buildProviderSummary(messages: ShippoDiagnosticMessage[]) {
  if (!messages.length) return null;
  return messages
    .map((message) => {
      const prefix = [message.code, message.source].filter(Boolean).join(" / ");
      return prefix ? `${prefix}: ${message.text}` : message.text;
    })
    .join(" | ");
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  let shipment: ManualShipmentRecord | null = null;

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

    const rows = (await sql(
      `
        SELECT *
        FROM public.manual_shipments
        WHERE id = $1::uuid
        LIMIT 1
      `,
      [params.id]
    )) as ManualShipmentRecord[];
    shipment = rows[0] ?? null;
    if (!shipment) {
      return NextResponse.json({ error: "Manual shipment not found" }, { status: 404 });
    }
    if (shipment.status === "purchased") {
      return NextResponse.json({ error: "Label already purchased", shipment }, { status: 400 });
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
    const labelPublicId = `manual-labels/${params.id}/${purchase.transaction_id || rateId}`;

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
      }
    }

    if ((!labelAssetUrl || !persistedLabelUrl) && purchase.transaction_id) {
      try {
        const fallbackUrl = await fetchTransactionLabelUrl(purchase.transaction_id);
        if (!persistedLabelUrl) persistedLabelUrl = fallbackUrl;
        await archiveLabel(fallbackUrl, "shippo_transaction");
        labelError = null;
        labelErrorCode = null;
      } catch (err) {
        if (!labelError) {
          labelError = (err as Error).message || "Unable to fetch Shippo label";
          labelErrorCode = "shippo_label_fetch_failed";
        }
      }
    }

    const updatedRows = (await sql(
      `
        UPDATE public.manual_shipments
        SET
          status = 'purchased',
          provider_rate_id = $2,
          label_url = $3,
          tracking_number = $4,
          tracking_url = $5,
          postage_amount = $6,
          postage_currency = $7,
          label_format = $8,
          selected_rate = $9::jsonb,
          shippo_transaction_id = $10,
          label_asset_url = COALESCE($11, label_asset_url),
          label_asset_provider = COALESCE($12, label_asset_provider),
          label_asset_public_id = COALESCE($13, label_asset_public_id),
          label_purchased_at = COALESCE(label_purchased_at, now()),
          updated_at = now()
        WHERE id = $1::uuid
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
      ]
    )) as ManualShipmentRecord[];

    const updated = normalizeShipment(updatedRows[0] ?? shipment);
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
    const currentShipment = normalizeShipment(shipment);

    if (err instanceof ShippoTransactionError) {
      const providerSummary = buildProviderSummary(err.shippoMessages) || message;
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
          shipment: currentShipment,
        },
        { status: 422 }
      );
    }

    const code =
      message.includes("SHIPPO_API_TOKEN") || message.includes("SHIPPO_TEST_TOKEN")
        ? "shippo_token_missing"
        : "shippo_purchase_failed";
    return NextResponse.json(
      {
        error: message,
        code,
        label_created: false,
        shipment_persisted: false,
        shipment: currentShipment,
      },
      { status: code === "shippo_token_missing" ? 500 : 502 }
    );
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
