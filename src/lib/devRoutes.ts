import { NextResponse } from "next/server";

export function areDevRoutesBlockedInCurrentRuntime() {
  return process.env.NODE_ENV === "production";
}

export function blockDevRouteInProduction() {
  if (!areDevRoutesBlockedInCurrentRuntime()) {
    return null;
  }

  return new NextResponse("Not found", { status: 404 });
}
