import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { setSentryUserFromSession } from "@/lib/sentryUser";

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  setSentryUserFromSession(session);
  if (!session) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user?.role !== "admin") {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

export async function requireUser() {
  const session = await getServerSession(authOptions);
  setSentryUserFromSession(session);
  if (!session || !session.user?.email) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session };
}
