import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import sql from "@/lib/db";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SubscribeBody = {
  email?: string;
  locale?: string;
  source?: string;
};

const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const isUuid = (value: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);

const normalizeLocale = (value?: string) => {
  const lc = value?.toLowerCase() ?? "";
  return lc === "es" ? "es" : "en";
};

function getClientIp(headers: Headers) {
  const headerKeys = ["x-forwarded-for", "x-real-ip", "x-nf-client-connection-ip"];
  for (const key of headerKeys) {
    const raw = headers.get(key);
    if (raw) {
      const first = raw.split(",")[0]?.trim();
      if (first) return first;
    }
  }
  return null;
}

export async function POST(request: Request) {
  let body: SubscribeBody;
  try {
    body = (await request.json()) as SubscribeBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const email = body.email?.toLowerCase().trim() ?? "";
  if (!email || !emailRegex.test(email)) {
    return NextResponse.json({ ok: false, error: "Enter a valid email." }, { status: 400 });
  }

  const locale = normalizeLocale(body.locale);
  const source = body.source?.trim() || "site_footer";
  const userAgent = request.headers.get("user-agent");
  const ip = getClientIp(request.headers);

  const authSession = await getServerSession(authOptions);
  const sessionUserId =
    authSession?.user?.id && isUuid(authSession.user.id) ? authSession.user.id : null;
  const sessionEmail = authSession?.user?.email?.toLowerCase().trim() ?? null;

  try {
    const userMatch = (await sql`
      SELECT id FROM public.users WHERE lower(email) = ${email} LIMIT 1
    `) as unknown as { id: string }[];
    const matchedUserId = userMatch[0]?.id ?? null;
    const userId = sessionUserId || matchedUserId || null;

    await sql`
      INSERT INTO public.marketing_subscribers (email, locale, source, user_id, status, ip, user_agent)
      VALUES (${email}, ${locale}, ${source}, ${userId}, 'subscribed', ${ip}, ${userAgent})
      ON CONFLICT (email) DO UPDATE
      SET status = 'subscribed',
          unsubscribed_at = NULL,
          locale = EXCLUDED.locale,
          source = EXCLUDED.source,
          user_id = COALESCE(EXCLUDED.user_id, marketing_subscribers.user_id),
          ip = COALESCE(EXCLUDED.ip, marketing_subscribers.ip),
          user_agent = COALESCE(EXCLUDED.user_agent, marketing_subscribers.user_agent)
    `;

    if (userId) {
      await sql`
        UPDATE public.users
        SET marketing_opt_in = TRUE
        WHERE id = ${userId}
      `;
    } else if (sessionEmail && sessionEmail === email && sessionUserId) {
      await sql`
        UPDATE public.users
        SET marketing_opt_in = TRUE
        WHERE id = ${sessionUserId}
      `;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Subscribe error", err);
    return NextResponse.json({ ok: false, error: "Unable to subscribe" }, { status: 500 });
  }
}
