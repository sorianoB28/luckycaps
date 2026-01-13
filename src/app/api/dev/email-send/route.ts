import { NextResponse } from "next/server";

import {
  normalizeLocale,
  sendOrderConfirmationEmail,
  sendShippingConfirmationEmail,
  type SendEmailResult,
} from "@/lib/email/resend";

const isDev = process.env.NODE_ENV !== "production";
const isUuid = (value: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    value
  );

const invalidRequest = (message: string, status = 400) =>
  NextResponse.json({ ok: false, error: message }, { status });

type EmailType = "order_confirmation" | "shipping_confirmation";

export async function GET(request: Request) {
  if (!isDev) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const typeParam = searchParams.get("type");
  const orderId = searchParams.get("orderId");
  const locale = normalizeLocale(searchParams.get("locale"));
  const force = searchParams.get("force") === "1";

  if (!typeParam || !orderId) {
    return invalidRequest("Missing type or orderId");
  }

  const type: EmailType | null =
    typeParam === "order_confirmation" || typeParam === "shipping_confirmation"
      ? typeParam
      : null;
  if (!type) {
    return invalidRequest("Invalid type");
  }

  if (!isUuid(orderId)) {
    return invalidRequest("Invalid orderId");
  }

  const sender =
    type === "order_confirmation"
      ? sendOrderConfirmationEmail
      : sendShippingConfirmationEmail;

  let result: SendEmailResult;
  try {
    result = await sender({ orderId, locale, forceSend: force });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to send email";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }

  if (!result.ok) {
    const status =
      result.error && result.error.toLowerCase().includes("not found") ? 404 : 500;
    return NextResponse.json(
      { ok: false, error: result.error ?? "Email send failed" },
      { status }
    );
  }

  return NextResponse.json({
    ok: true,
    skipped: !!result.skipped,
    provider_message_id: result.providerMessageId ?? null,
    used_to_email: result.toEmail ?? null,
    from: result.from ?? null,
    reply_to: result.replyTo ?? null,
  });
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";
