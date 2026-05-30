import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/adminAuth";
import sql from "@/lib/adminDb";

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

type ManualShipmentRow = Record<string, unknown>;

export async function GET() {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    const rows = (await sql(
      `
        SELECT *
        FROM public.manual_shipments
        ORDER BY created_at DESC
        LIMIT 50
      `
    )) as ManualShipmentRow[];

    const shipments = rows.map((row) => ({
      ...row,
      recipient: parseJson(row.recipient, null),
      parcel: parseJson(row.parcel, null),
      rates: parseJson(row.rates, []),
      selected_rate: parseJson(row.selected_rate, null),
    }));

    return NextResponse.json({ shipments });
  } catch (err) {
    console.error("Admin manual shipments fetch failed", err);
    return NextResponse.json({ error: "Unable to load manual shipments" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
