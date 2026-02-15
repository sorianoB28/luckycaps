import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }

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
