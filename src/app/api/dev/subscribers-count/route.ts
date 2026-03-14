import { NextResponse } from "next/server";

import { blockDevRouteInProduction } from "@/lib/devRoutes";
import sql from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const blockedResponse = blockDevRouteInProduction();
  if (blockedResponse) return blockedResponse;

  try {
    const rows = (await sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'subscribed')::int AS subscribed
      FROM public.marketing_subscribers
    `) as unknown as { total: number; subscribed: number }[];

    const counts = rows[0] ?? { total: 0, subscribed: 0 };
    return NextResponse.json({ total: counts.total, subscribed: counts.subscribed });
  } catch (err) {
    console.error("subscribers-count error", err);
    return NextResponse.json({ error: "Unable to load" }, { status: 500 });
  }
}
