import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import sql from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SeedAdminBody = {
  email?: string;
  password?: string;
  first_name?: string;
  last_name?: string;
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }

  let body: SeedAdminBody;
  try {
    body = (await request.json()) as SeedAdminBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = body.email?.toLowerCase().trim() ?? "";
  const password = body.password ?? "";
  const firstName = body.first_name?.trim() || null;
  const lastName = body.last_name?.trim() || null;

  if (!email || !emailRegex.test(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  try {
    const existing = (await sql`
      SELECT id, first_name, last_name
      FROM public.users
      WHERE lower(email) = ${email}
      LIMIT 1
    `) as unknown as Array<{
      id: string;
      first_name: string | null;
      last_name: string | null;
    }>;

    const hash = await bcrypt.hash(password, 10);

    if (existing[0]?.id) {
      const updated = (await sql`
        UPDATE public.users
        SET
          password_hash = ${hash},
          role = 'admin',
          first_name = ${firstName ?? existing[0].first_name},
          last_name = ${lastName ?? existing[0].last_name},
          updated_at = now()
        WHERE id = ${existing[0].id}::uuid
        RETURNING id, email, role
      `) as unknown as Array<{ id: string; email: string; role: string }>;

      return NextResponse.json({ ok: true, created: false, user: updated[0] });
    }

    const inserted = (await sql`
      INSERT INTO public.users (email, password_hash, first_name, last_name, marketing_opt_in, role)
      VALUES (${email}, ${hash}, ${firstName}, ${lastName}, false, 'admin')
      RETURNING id, email, role
    `) as unknown as Array<{ id: string; email: string; role: string }>;

    return NextResponse.json({ ok: true, created: true, user: inserted[0] }, { status: 201 });
  } catch (err) {
    console.error("seed-admin error", err);
    return NextResponse.json({ error: "Unable to seed admin user" }, { status: 500 });
  }
}
