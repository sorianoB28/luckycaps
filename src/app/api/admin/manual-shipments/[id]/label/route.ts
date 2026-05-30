import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/adminAuth";
import sql from "@/lib/adminDb";
import { uploadLabelBufferToCloudinary } from "@/lib/shipping/labelStorage";
import { fetchTransactionLabelUrl } from "@/lib/shipping/shippo";

const isUuid = (value: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);

type ManualShipmentRow = Record<string, unknown>;
type LabelCandidate = { url: string; source: "asset" | "shippo" | "legacy" };

const readString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

async function fetchManualShipment(id: string) {
  const rows = (await sql(
    `
      SELECT *
      FROM public.manual_shipments
      WHERE id = $1::uuid
      LIMIT 1
    `,
    [id]
  )) as ManualShipmentRow[];
  return rows[0] ?? null;
}

async function downloadLabelBuffer(labelUrl: string) {
  const res = await fetch(labelUrl);
  if (!res.ok) {
    throw new Error(`Label download failed (${res.status})`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function buildCandidates(shipment: ManualShipmentRow) {
  const candidates: LabelCandidate[] = [];
  const assetUrl = readString(shipment.label_asset_url);
  if (assetUrl) candidates.push({ url: assetUrl, source: "asset" });

  const transactionId = readString(shipment.shippo_transaction_id);
  if (transactionId) {
    try {
      const shippoUrl = await fetchTransactionLabelUrl(transactionId);
      if (shippoUrl) candidates.push({ url: shippoUrl, source: "shippo" });
    } catch {
      // fallback to legacy label_url below
    }
  }

  const legacyUrl = readString(shipment.label_url);
  if (legacyUrl) candidates.push({ url: legacyUrl, source: "legacy" });
  return { candidates, transactionId };
}

async function archiveIfNeeded(
  shipment: ManualShipmentRow,
  id: string,
  buffer: Buffer,
  source: LabelCandidate["source"],
  transactionId: string
) {
  if (source === "asset") return;

  const publicId = `manual-labels/${id}/${readString(shipment.id) || transactionId || "label"}`;
  const upload = await uploadLabelBufferToCloudinary({
    buffer,
    public_id: publicId,
    folder: null,
  });

  await sql(
    `
      UPDATE public.manual_shipments
      SET
        label_asset_url = $2,
        label_asset_provider = $3,
        label_asset_public_id = $4,
        updated_at = now()
      WHERE id = $1::uuid
    `,
    [id, upload.asset_url, "cloudinary", upload.public_id]
  );
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    if (!params.id || !isUuid(params.id)) {
      return NextResponse.json({ error: "Invalid id", code: "invalid_id" }, { status: 400 });
    }

    const shipment = await fetchManualShipment(params.id);
    if (!shipment) {
      return NextResponse.json(
        { error: "Manual shipment not found", code: "manual_shipment_not_found" },
        { status: 404 }
      );
    }

    const { candidates, transactionId } = await buildCandidates(shipment);
    if (!candidates.length) {
      return NextResponse.json({ error: "Missing label URL", code: "label_not_found" }, { status: 404 });
    }

    let lastError = "Unable to download label";
    for (const candidate of candidates) {
      try {
        const buffer = await downloadLabelBuffer(candidate.url);
        await archiveIfNeeded(shipment, params.id, buffer, candidate.source, transactionId);
        const headers = new Headers();
        headers.set("Content-Type", "application/pdf");
        headers.set("Content-Disposition", `attachment; filename="manual-shipping-label-${params.id}.pdf"`);
        headers.set("Content-Length", String(buffer.length));
        headers.set("Cache-Control", "no-store");
        return new Response(new Uint8Array(buffer), { status: 200, headers });
      } catch (err) {
        lastError = (err as Error).message || lastError;
      }
    }

    return NextResponse.json({ error: lastError, code: "label_download_failed" }, { status: 502 });
  } catch (err) {
    console.error("Admin manual label download failed", err);
    return NextResponse.json(
      { error: (err as Error).message || "Unable to retrieve label", code: "label_fetch_failed" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
