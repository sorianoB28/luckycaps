import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/adminAuth";
import sql from "@/lib/adminDb";
import { uploadLabelBufferToCloudinary } from "@/lib/shipping/labelStorage";
import { fetchTransactionLabelUrl } from "@/lib/shipping/shippo";

const isUuid = (value: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    value
  );

type ShipmentRow = Record<string, unknown>;

type LabelCandidate = {
  url: string;
  source: "asset" | "shippo" | "legacy";
};

const readString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

async function fetchShipment(id: string) {
  const shipmentRows = (await sql(
    `
      SELECT *
      FROM public.shipments
      WHERE id = $1::uuid
      LIMIT 1
    `,
    [id]
  )) as ShipmentRow[];

  return shipmentRows[0] ?? null;
}

async function downloadLabelBuffer(labelUrl: string) {
  const res = await fetch(labelUrl);
  if (!res.ok) {
    throw new Error(`Label download failed (${res.status})`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function buildLabelCandidates(shipment: ShipmentRow) {
  const candidates: LabelCandidate[] = [];
  const labelAssetUrl = readString(shipment.label_asset_url);
  if (labelAssetUrl) {
    candidates.push({ url: labelAssetUrl, source: "asset" });
  }

  const transactionId = readString(shipment.shippo_transaction_id);
  let shippoError: { code: string; message: string } | null = null;
  if (transactionId) {
    try {
      const shippoUrl = await fetchTransactionLabelUrl(transactionId);
      if (shippoUrl) {
        candidates.push({ url: shippoUrl, source: "shippo" });
      }
    } catch (err) {
      const message = (err as Error).message || "Unable to fetch Shippo label";
      const code = message.includes("Missing Shippo API token")
        ? "shippo_token_missing"
        : "shippo_label_fetch_failed";
      console.error("Shippo label fetch failed", {
        code,
        shipment_id: shipment.id,
        order_id: shipment.order_id,
        error: message,
      });
      shippoError = { code, message };
    }
  }

  const legacyLabelUrl = readString(shipment.label_url);
  if (legacyLabelUrl) {
    candidates.push({ url: legacyLabelUrl, source: "legacy" });
  }

  return { candidates, transactionId, shippoError };
}

async function resolveLabelBuffer(shipment: ShipmentRow) {
  const { candidates, transactionId, shippoError } = await buildLabelCandidates(shipment);
  if (!candidates.length) {
    if (shippoError) {
      return {
        error: {
          code: shippoError.code,
          message: shippoError.message,
        },
        status: 502,
      };
    }

    return {
      error: {
        code: "label_not_found",
        message: "Missing Shippo transaction id or label URL.",
      },
      status: 404,
    };
  }

  let lastError: string | null = null;
  const attempts: Array<{ source: LabelCandidate["source"]; message: string }> = [];
  for (const candidate of candidates) {
    try {
      const buffer = await downloadLabelBuffer(candidate.url);
      return { buffer, candidate, transactionId };
    } catch (err) {
      const message = (err as Error).message || "Label download failed";
      attempts.push({ source: candidate.source, message });
      lastError = message;
    }
  }

  console.error("Label download failed", {
    code: shippoError?.code || "label_download_failed",
    shipment_id: shipment.id,
    order_id: shipment.order_id,
    error: shippoError?.message || lastError || "Unable to download label",
    attempts,
  });

  return {
    error: {
      code: shippoError?.code || "label_download_failed",
      message:
        shippoError?.message ||
        lastError ||
        "Unable to download label from Shippo or archive.",
    },
    status: 502,
  };
}

async function archiveLabelIfNeeded(
  shipment: ShipmentRow,
  buffer: Buffer,
  candidate: LabelCandidate,
  transactionId: string
) {
  if (candidate.source === "asset") {
    return { shipment, label_asset_url: readString(shipment.label_asset_url) };
  }

  const orderId = readString(shipment.order_id);
  const shipmentId = readString(shipment.id);
  const publicId = `labels/${orderId || "order"}/${shipmentId || transactionId || "label"}`;
  if (!publicId) {
    return { shipment, label_asset_url: null };
  }
  if (!shipmentId) {
    return { shipment, label_asset_url: null };
  }

  try {
    const upload = await uploadLabelBufferToCloudinary({
      buffer,
      public_id: publicId,
      folder: null,
    });

    const updatedRows = (await sql(
      `
        UPDATE public.shipments
        SET
          label_asset_url = $2,
          label_asset_provider = $3,
          label_asset_public_id = $4
        WHERE id = $1::uuid
        RETURNING *
      `,
      [shipmentId, upload.asset_url, "cloudinary", upload.public_id]
    )) as ShipmentRow[];

    return { shipment: updatedRows[0] ?? shipment, label_asset_url: upload.asset_url };
  } catch (err) {
    const message = (err as Error).message || "Unable to archive label";
    console.error("Label archive failed", {
      code: "cloudinary_upload_failed",
      shipment_id: shipment.id,
      order_id: shipment.order_id,
      error: message,
    });
    return { shipment, label_asset_url: null, archive_error: message };
  }
}

function buildFilename(shipment: ShipmentRow, fallbackId: string) {
  const baseId = readString(shipment.order_id) || readString(shipment.id) || fallbackId;
  const safeId = baseId.replace(/[^a-zA-Z0-9-_]/g, "");
  return `shipping-label-${safeId || fallbackId}.pdf`;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    if (!params.id || !isUuid(params.id)) {
      return NextResponse.json({ error: "Invalid id", code: "invalid_id" }, { status: 400 });
    }

    const shipment = await fetchShipment(params.id);
    if (!shipment) {
      return NextResponse.json(
        { error: "Shipment not found", code: "shipment_not_found" },
        { status: 404 }
      );
    }

    const resolved = await resolveLabelBuffer(shipment);
    if ("error" in resolved) {
      return NextResponse.json(
        { error: resolved.error.message, code: resolved.error.code },
        { status: resolved.status }
      );
    }

    const { buffer, candidate, transactionId } = resolved;
    await archiveLabelIfNeeded(shipment, buffer, candidate, transactionId);

    const filename = buildFilename(shipment, params.id);
    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);
    headers.set("Content-Length", String(buffer.length));
    headers.set("Cache-Control", "no-store");

    return new Response(buffer, { status: 200, headers });
  } catch (err) {
    console.error("Admin shipment label download failed", err);
    return NextResponse.json(
      { error: (err as Error).message || "Unable to retrieve label", code: "label_fetch_failed" },
      { status: 500 }
    );
  }
}

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    if (!params.id || !isUuid(params.id)) {
      return NextResponse.json({ error: "Invalid id", code: "invalid_id" }, { status: 400 });
    }

    const shipment = await fetchShipment(params.id);
    if (!shipment) {
      return NextResponse.json(
        { error: "Shipment not found", code: "shipment_not_found" },
        { status: 404 }
      );
    }

    const existingAsset = readString(shipment.label_asset_url);
    if (existingAsset) {
      return NextResponse.json({ label_url: existingAsset, shipment, archived: true });
    }

    const resolved = await resolveLabelBuffer(shipment);
    if ("error" in resolved) {
      return NextResponse.json(
        { error: resolved.error.message, code: resolved.error.code },
        { status: resolved.status }
      );
    }

    const { buffer, candidate, transactionId } = resolved;
    const archiveResult = await archiveLabelIfNeeded(shipment, buffer, candidate, transactionId);
    if (!archiveResult.label_asset_url) {
      return NextResponse.json(
        {
          error: archiveResult.archive_error || "Unable to archive label",
          code: "cloudinary_upload_failed",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      label_url: archiveResult.label_asset_url,
      shipment: archiveResult.shipment,
      archived: true,
    });
  } catch (err) {
    console.error("Admin shipment label archive failed", err);
    return NextResponse.json(
      { error: (err as Error).message || "Unable to archive label", code: "label_archive_failed" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
