import { NextResponse } from "next/server";

import { blockDevRouteInProduction } from "@/lib/devRoutes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const blockedResponse = blockDevRouteInProduction();
  if (blockedResponse) return blockedResponse;

  return NextResponse.json(
    {
      ok: true,
      service: "luckycaps-dev-e2e",
      nodeEnv: process.env.NODE_ENV ?? "unknown",
      now: new Date().toISOString(),
    },
    { status: 200 }
  );
}
