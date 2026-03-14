import { NextResponse } from "next/server";

import sql from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id")?.trim() ?? "";
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  try {
    const rows = (await sql`
      SELECT id
      FROM public.orders
      WHERE stripe_checkout_session_id = ${sessionId}
      LIMIT 1
    `) as Array<{ id: string }>;

    const orderId = rows[0]?.id ?? null;
    if (!orderId) {
      return NextResponse.json({ found: false });
    }

    return NextResponse.json({ found: true, orderId });
  } catch (err) {
    console.error("Lookup order by stripe session failed", err);
    return NextResponse.json({ error: "Unable to load order" }, { status: 500 });
  }
}
