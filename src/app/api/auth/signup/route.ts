import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import sql from "@/lib/db";

type SignupBody = {
  email?: string;
  password?: string;
  first_name?: string;
  last_name?: string;
  marketing_opt_in?: boolean;
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const adminEmails = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export async function POST(request: Request) {
  let body: SignupBody;
  try {
    body = (await request.json()) as SignupBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = body.email?.toLowerCase().trim() ?? "";
  const password = body.password ?? "";
  const firstName = body.first_name?.trim() || null;
  const lastName = body.last_name?.trim() || null;
  const marketingOptIn = Boolean(body.marketing_opt_in);

  if (!email || !emailRegex.test(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const existing = (await sql`
    SELECT id FROM public.users WHERE lower(email) = ${email} LIMIT 1
  `) as unknown as { id: string }[];

  if (existing.length) {
    return NextResponse.json({ error: "Email already registered" }, { status: 400 });
  }

  const hash = await bcrypt.hash(password, 10);
  const role = adminEmails.includes(email) ? "admin" : "customer";

  try {
    const rows = (await sql`
      INSERT INTO public.users (email, password_hash, first_name, last_name, marketing_opt_in, role)
      VALUES (${email}, ${hash}, ${firstName}, ${lastName}, ${marketingOptIn}, ${role})
      RETURNING id, email
    `) as unknown as { id: string; email: string }[];

    const user = rows[0];

    return NextResponse.json({ ok: true, userId: user.id }, { status: 201 });
  } catch (err) {
    const message = (err as Error).message ?? "";
    if (message.includes("users_email_key")) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to create account" }, { status: 500 });
  }
}
