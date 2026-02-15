import { NextResponse } from "next/server";

import sql from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type UpsertBody = {
  email?: string;
  locale?: string;
  source?: string;
};

type SubscriberRow = {
  email: string;
  status: string | null;
  locale: string | null;
  source: string | null;
  user_id: string | null;
};

function notFound() {
  return new NextResponse("Not found", { status: 404 });
}

function normalizeEmail(raw: string | null | undefined) {
  return raw?.trim().toLowerCase() ?? "";
}

function normalizeLocale(raw: string | null | undefined) {
  return raw?.trim().toLowerCase() === "es" ? "es" : "en";
}

function getEmailError() {
  return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
}

async function lookupByEmail(email: string) {
  const rows = (await sql`
    SELECT email, status, locale, source, user_id
    FROM public.marketing_subscribers
    WHERE lower(email) = ${email}
    LIMIT 1
  `) as unknown as SubscriberRow[];

  const countRows = (await sql`
    SELECT COUNT(*)::int AS count
    FROM public.marketing_subscribers
    WHERE lower(email) = ${email}
  `) as unknown as Array<{ count: number }>;

  return {
    count: countRows[0]?.count ?? 0,
    subscriber: rows[0] ?? null,
  };
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return notFound();
  }

  const { searchParams } = new URL(request.url);
  const email = normalizeEmail(searchParams.get("email"));
  if (!email || !emailRegex.test(email)) {
    return getEmailError();
  }

  try {
    const result = await lookupByEmail(email);
    return NextResponse.json(
      {
        ok: true,
        email,
        exists: result.count > 0,
        count: result.count,
        subscriber: result.subscriber,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("dev marketing-subscriber GET error", err);
    return NextResponse.json({ error: "Unable to load subscriber" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return notFound();
  }

  let body: UpsertBody;
  try {
    body = (await request.json()) as UpsertBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  if (!email || !emailRegex.test(email)) {
    return getEmailError();
  }

  const locale = normalizeLocale(body.locale);
  const source = body.source?.trim() || "e2e_dev";

  try {
    const previous = await lookupByEmail(email);
    const alreadySubscribed = previous.subscriber?.status === "subscribed";

    const rows = (await sql`
      INSERT INTO public.marketing_subscribers (email, locale, source, status, user_id, ip, user_agent)
      VALUES (${email}, ${locale}, ${source}, 'subscribed', null, null, 'e2e')
      ON CONFLICT (email) DO UPDATE
      SET status = 'subscribed',
          unsubscribed_at = NULL,
          locale = EXCLUDED.locale,
          source = EXCLUDED.source,
          user_agent = COALESCE(EXCLUDED.user_agent, marketing_subscribers.user_agent)
      RETURNING email, status, locale, source, user_id
    `) as unknown as SubscriberRow[];

    const current = await lookupByEmail(email);

    return NextResponse.json(
      {
        ok: true,
        email,
        alreadySubscribed,
        count: current.count,
        subscriber: rows[0] ?? current.subscriber,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("dev marketing-subscriber POST error", err);
    return NextResponse.json({ error: "Unable to upsert subscriber" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return notFound();
  }

  const { searchParams } = new URL(request.url);
  const email = normalizeEmail(searchParams.get("email"));
  if (!email || !emailRegex.test(email)) {
    return getEmailError();
  }

  try {
    const rows = (await sql`
      DELETE FROM public.marketing_subscribers
      WHERE lower(email) = ${email}
      RETURNING email
    `) as unknown as Array<{ email: string }>;

    return NextResponse.json(
      {
        ok: true,
        email,
        deleted: rows.length,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("dev marketing-subscriber DELETE error", err);
    return NextResponse.json({ error: "Unable to delete subscriber" }, { status: 500 });
  }
}
