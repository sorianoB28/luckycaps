import "server-only";

import sql from "@/lib/db";
import { sendOrderConfirmationEmail, type SendEmailResult } from "@/lib/email/resend";

let ensured = false;
let ensuredStripeWebhookEvents = false;

const isUuid = (value: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    value
  );

export async function ensureCheckoutSessionsTable() {
  if (ensured) return;

  await sql`
    CREATE TABLE IF NOT EXISTS public.checkout_sessions (
      id uuid PRIMARY KEY,
      stripe_checkout_session_id text UNIQUE,
      stripe_payment_intent_id text,
      user_id uuid,
      email text NOT NULL,
      customer_name text,
      customer_phone text,
      contact jsonb,
      shipping_address jsonb,
      delivery_option text,
      promo_code text,
      promo_code_id uuid,
      discount_cents int NOT NULL DEFAULT 0,
      subtotal_cents int NOT NULL,
      shipping_cents int NOT NULL DEFAULT 0,
      shipping_currency text NOT NULL DEFAULT 'USD',
      tax_cents int NOT NULL DEFAULT 0,
      total_cents int NOT NULL,
      currency text NOT NULL DEFAULT 'usd',
      items jsonb NOT NULL,
      order_id uuid,
      created_at timestamptz NOT NULL DEFAULT now(),
      completed_at timestamptz
    )
  `;

  await sql`
    ALTER TABLE public.checkout_sessions
    ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text
  `;
  await sql`
    ALTER TABLE public.checkout_sessions
    ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text
  `;
  await sql`
    ALTER TABLE public.checkout_sessions
    ADD COLUMN IF NOT EXISTS user_id uuid
  `;
  await sql`
    ALTER TABLE public.checkout_sessions
    ADD COLUMN IF NOT EXISTS email text
  `;
  await sql`
    ALTER TABLE public.checkout_sessions
    ADD COLUMN IF NOT EXISTS customer_name text
  `;
  await sql`
    ALTER TABLE public.checkout_sessions
    ADD COLUMN IF NOT EXISTS customer_phone text
  `;
  await sql`
    ALTER TABLE public.checkout_sessions
    ADD COLUMN IF NOT EXISTS contact jsonb
  `;
  await sql`
    ALTER TABLE public.checkout_sessions
    ADD COLUMN IF NOT EXISTS shipping_address jsonb
  `;
  await sql`
    ALTER TABLE public.checkout_sessions
    ADD COLUMN IF NOT EXISTS delivery_option text
  `;
  await sql`
    ALTER TABLE public.checkout_sessions
    ADD COLUMN IF NOT EXISTS promo_code text
  `;
  await sql`
    ALTER TABLE public.checkout_sessions
    ADD COLUMN IF NOT EXISTS promo_code_id uuid
  `;
  await sql`
    ALTER TABLE public.checkout_sessions
    ADD COLUMN IF NOT EXISTS discount_cents int
  `;
  await sql`
    ALTER TABLE public.checkout_sessions
    ADD COLUMN IF NOT EXISTS subtotal_cents int
  `;
  await sql`
    ALTER TABLE public.checkout_sessions
    ADD COLUMN IF NOT EXISTS shipping_cents int
  `;
  await sql`
    ALTER TABLE public.checkout_sessions
    ADD COLUMN IF NOT EXISTS shipping_currency text
  `;
  await sql`
    ALTER TABLE public.checkout_sessions
    ADD COLUMN IF NOT EXISTS tax_cents int
  `;
  await sql`
    ALTER TABLE public.checkout_sessions
    ADD COLUMN IF NOT EXISTS total_cents int
  `;
  await sql`
    ALTER TABLE public.checkout_sessions
    ADD COLUMN IF NOT EXISTS currency text
  `;
  await sql`
    ALTER TABLE public.checkout_sessions
    ADD COLUMN IF NOT EXISTS items jsonb
  `;
  await sql`
    ALTER TABLE public.checkout_sessions
    ADD COLUMN IF NOT EXISTS order_id uuid
  `;
  await sql`
    ALTER TABLE public.checkout_sessions
    ADD COLUMN IF NOT EXISTS created_at timestamptz
  `;
  await sql`
    ALTER TABLE public.checkout_sessions
    ADD COLUMN IF NOT EXISTS completed_at timestamptz
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS checkout_sessions_user_id_idx
    ON public.checkout_sessions (user_id)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS checkout_sessions_created_at_idx
    ON public.checkout_sessions (created_at)
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS checkout_sessions_stripe_checkout_session_id_uidx
    ON public.checkout_sessions (stripe_checkout_session_id)
    WHERE stripe_checkout_session_id IS NOT NULL
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS orders_stripe_checkout_session_id_uidx
    ON public.orders (stripe_checkout_session_id)
    WHERE stripe_checkout_session_id IS NOT NULL
  `;
  await sql`
    UPDATE public.checkout_sessions
    SET
      discount_cents = COALESCE(discount_cents, 0),
      subtotal_cents = COALESCE(subtotal_cents, 0),
      shipping_cents = COALESCE(shipping_cents, 0),
      tax_cents = COALESCE(tax_cents, 0),
      total_cents = COALESCE(
        total_cents,
        COALESCE(subtotal_cents, 0) - COALESCE(discount_cents, 0) + COALESCE(shipping_cents, 0) + COALESCE(tax_cents, 0)
      ),
      shipping_currency = COALESCE(NULLIF(shipping_currency, ''), UPPER(COALESCE(currency, 'usd')))
    WHERE
      discount_cents IS NULL
      OR subtotal_cents IS NULL
      OR shipping_cents IS NULL
      OR tax_cents IS NULL
      OR total_cents IS NULL
      OR shipping_currency IS NULL
      OR shipping_currency = ''
  `;
  await sql`
    ALTER TABLE public.checkout_sessions
    ALTER COLUMN discount_cents SET DEFAULT 0
  `;
  await sql`
    ALTER TABLE public.checkout_sessions
    ALTER COLUMN subtotal_cents SET DEFAULT 0
  `;
  await sql`
    ALTER TABLE public.checkout_sessions
    ALTER COLUMN shipping_cents SET DEFAULT 0
  `;
  await sql`
    ALTER TABLE public.checkout_sessions
    ALTER COLUMN tax_cents SET DEFAULT 0
  `;
  await sql`
    ALTER TABLE public.checkout_sessions
    ALTER COLUMN total_cents SET DEFAULT 0
  `;
  await sql`
    ALTER TABLE public.checkout_sessions
    ALTER COLUMN shipping_currency SET DEFAULT 'USD'
  `;
  await sql`
    ALTER TABLE public.checkout_sessions
    ALTER COLUMN discount_cents SET NOT NULL
  `;
  await sql`
    ALTER TABLE public.checkout_sessions
    ALTER COLUMN subtotal_cents SET NOT NULL
  `;
  await sql`
    ALTER TABLE public.checkout_sessions
    ALTER COLUMN shipping_cents SET NOT NULL
  `;
  await sql`
    ALTER TABLE public.checkout_sessions
    ALTER COLUMN total_cents SET NOT NULL
  `;
  await sql`
    ALTER TABLE public.checkout_sessions
    ALTER COLUMN shipping_currency SET NOT NULL
  `;

  ensured = true;
}

export async function ensureStripeWebhookEventsTable() {
  if (ensuredStripeWebhookEvents) return;

  await sql`
    CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
      event_id text PRIMARY KEY,
      event_type text NOT NULL,
      stripe_checkout_session_id text,
      processed_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS stripe_webhook_events_session_idx
    ON public.stripe_webhook_events (stripe_checkout_session_id)
    WHERE stripe_checkout_session_id IS NOT NULL
  `;

  ensuredStripeWebhookEvents = true;
}

export async function hasStripeWebhookEventBeenProcessed(eventId: string) {
  if (!eventId) return false;
  await ensureStripeWebhookEventsTable();
  const rows = (await sql`
    SELECT 1
    FROM public.stripe_webhook_events
    WHERE event_id = ${eventId}
    LIMIT 1
  `) as Array<Record<string, unknown>>;
  return rows.length > 0;
}

export async function markStripeWebhookEventProcessed(params: {
  eventId: string;
  eventType: string;
  stripeCheckoutSessionId: string | null;
}) {
  const { eventId, eventType, stripeCheckoutSessionId } = params;
  if (!eventId) return;
  await ensureStripeWebhookEventsTable();
  await sql`
    INSERT INTO public.stripe_webhook_events (
      event_id,
      event_type,
      stripe_checkout_session_id
    )
    VALUES (
      ${eventId},
      ${eventType},
      ${stripeCheckoutSessionId}
    )
    ON CONFLICT (event_id) DO NOTHING
  `;
}

export async function attachStripeSessionToCheckout(params: {
  checkoutId: string;
  stripeCheckoutSessionId: string;
}) {
  await ensureCheckoutSessionsTable();
  const { checkoutId, stripeCheckoutSessionId } = params;
  if (!isUuid(checkoutId)) throw new Error("Invalid checkout id");
  if (!stripeCheckoutSessionId) throw new Error("Missing stripe session id");

  await sql`
    UPDATE public.checkout_sessions
    SET stripe_checkout_session_id = ${stripeCheckoutSessionId}
    WHERE id = ${checkoutId}::uuid
  `;
}

export async function finalizeCheckoutByStripeSession(params: {
  stripeCheckoutSessionId: string;
  stripePaymentIntentId: string | null;
}): Promise<{
  orderId: string | null;
  emailAttempted: boolean;
  emailResult: SendEmailResult | null;
}> {
  await ensureCheckoutSessionsTable();
  const { stripeCheckoutSessionId, stripePaymentIntentId } = params;
  if (!stripeCheckoutSessionId) throw new Error("Missing stripe session id");

  let rows: Array<{ order_id: string | null; new_order_id: string | null }> = [];
  let emailAttempted = false;
  let emailResult: SendEmailResult | null = null;
  try {
    rows = (await sql`
      WITH cs AS (
      SELECT
        id,
        user_id,
        email,
        customer_name,
        customer_phone,
        contact,
        shipping_address,
        delivery_option,
        promo_code_id,
        promo_code,
        COALESCE(discount_cents, 0)::int AS discount_cents,
        COALESCE(subtotal_cents, 0)::int AS subtotal_cents,
        COALESCE(shipping_cents, 0)::int AS shipping_cents,
        COALESCE(tax_cents, 0)::int AS tax_cents,
        COALESCE(
          total_cents,
          COALESCE(subtotal_cents, 0) - COALESCE(discount_cents, 0) + COALESCE(shipping_cents, 0) + COALESCE(tax_cents, 0)
        )::int AS total_cents,
        COALESCE(NULLIF(currency, ''), 'usd') AS currency,
        items,
        stripe_checkout_session_id
      FROM public.checkout_sessions
      WHERE stripe_checkout_session_id = ${stripeCheckoutSessionId}
      LIMIT 1
    ),
      existing AS (
        SELECT id
        FROM public.orders
        WHERE stripe_checkout_session_id = ${stripeCheckoutSessionId}
        LIMIT 1
      ),
      mark_paid_existing AS (
        UPDATE public.orders
        SET
          status = 'paid',
          paid_at = COALESCE(paid_at, now()),
          stripe_payment_intent_id = COALESCE(stripe_payment_intent_id, ${stripePaymentIntentId}),
          updated_at = now()
        WHERE stripe_checkout_session_id = ${stripeCheckoutSessionId}
        RETURNING id
      ),
      new_order AS (
      INSERT INTO public.orders (
        user_id,
        customer_name,
        customer_phone,
        email,
        status,
        paid_at,
        contact,
        shipping_address,
        delivery_option,
        promo_code_id,
        promo_code,
        discount_cents,
        shipping_cents,
        tax_cents,
        subtotal_cents,
        total_cents,
        payment_provider,
        currency,
        stripe_checkout_session_id,
        stripe_payment_intent_id
      )
      SELECT
        cs.user_id,
        cs.customer_name,
        cs.customer_phone,
        cs.email,
        'paid',
        now(),
        cs.contact,
        cs.shipping_address,
        cs.delivery_option,
        cs.promo_code_id,
        cs.promo_code,
        cs.discount_cents,
        cs.shipping_cents,
        cs.tax_cents,
        cs.subtotal_cents,
        cs.total_cents,
        'stripe',
        cs.currency,
        cs.stripe_checkout_session_id,
        ${stripePaymentIntentId}
      FROM cs
      WHERE NOT EXISTS (SELECT 1 FROM existing)
      RETURNING id
    ),
      target_order AS (
        SELECT id FROM new_order
        UNION ALL
        SELECT id FROM existing
      ),
      inserted_items AS (
      INSERT INTO public.order_items (
          order_id,
          product_id,
          product_slug,
          name,
          image_url,
          price_cents,
          variant,
          size,
          quantity
        )
        SELECT
          (SELECT id FROM target_order LIMIT 1),
          item.product_id::uuid,
          item.product_slug,
          item.name,
          item.image_url,
          item.price_cents,
          item.variant,
          item.size,
          item.quantity
        FROM cs,
          jsonb_to_recordset(cs.items) AS item(
            product_id text,
            product_slug text,
            name text,
            image_url text,
            price_cents int,
            variant text,
            size text,
            quantity int
          )
      WHERE EXISTS (SELECT 1 FROM new_order)
    ),
    redeemed AS (
      UPDATE public.promo_codes pc
      SET
        times_redeemed = COALESCE(pc.times_redeemed, 0) + 1,
        updated_at = now()
      FROM cs
      WHERE pc.id = cs.promo_code_id
        AND cs.promo_code_id IS NOT NULL
        AND EXISTS (SELECT 1 FROM new_order)
    ),
    updated_stock AS (
      UPDATE public.products p
      SET stock = p.stock - src.qty
      FROM (
          SELECT product_id::uuid AS pid, SUM(quantity)::int AS qty
          FROM cs,
            jsonb_to_recordset(cs.items) AS item(
              product_id text,
              product_slug text,
              name text,
              image_url text,
              price_cents int,
              variant text,
              size text,
              quantity int
            )
          GROUP BY product_id
        ) AS src
        WHERE p.id = src.pid
          AND EXISTS (SELECT 1 FROM new_order)
      ),
      mark_checkout AS (
        UPDATE public.checkout_sessions
        SET
          stripe_payment_intent_id = COALESCE(stripe_payment_intent_id, ${stripePaymentIntentId}),
          completed_at = COALESCE(completed_at, now()),
          order_id = (SELECT id FROM target_order LIMIT 1)
        WHERE stripe_checkout_session_id = ${stripeCheckoutSessionId}
        RETURNING order_id
      )
      SELECT
        (SELECT order_id FROM mark_checkout) AS order_id,
        (SELECT id FROM new_order LIMIT 1) AS new_order_id
    `) as Array<{ order_id: string | null; new_order_id: string | null }>;
  } catch (err) {
    const existingRows = (await sql`
      SELECT id
      FROM public.orders
      WHERE stripe_checkout_session_id = ${stripeCheckoutSessionId}
      LIMIT 1
    `) as Array<{ id: string }>;
    const existingOrderId = existingRows[0]?.id;
    if (existingOrderId) {
      await sql`
        UPDATE public.checkout_sessions
        SET
        stripe_payment_intent_id = COALESCE(stripe_payment_intent_id, ${stripePaymentIntentId}),
        completed_at = COALESCE(completed_at, now()),
        order_id = ${existingOrderId}::uuid
      WHERE stripe_checkout_session_id = ${stripeCheckoutSessionId}
      `;
      return { orderId: existingOrderId, emailAttempted, emailResult };
    }
    throw err;
  }

  const orderId = rows?.[0]?.order_id ?? rows?.[0]?.new_order_id ?? null;
  const isNewOrder = Boolean(rows?.[0]?.new_order_id);
  if (orderId) {
    try {
      await sql`
        INSERT INTO public.shipments (order_id, provider, status, rates)
        VALUES (${orderId}::uuid, 'shippo', 'draft', '[]'::jsonb)
        ON CONFLICT (order_id) DO NOTHING
      `;
    } catch (err) {
      console.error("Unable to create shipment draft", err);
    }
    if (isNewOrder) {
      try {
        emailAttempted = true;
        emailResult = await sendOrderConfirmationEmail({ orderId });
      } catch (err) {
        emailAttempted = true;
        const message = err instanceof Error ? err.message : "Unknown error";
        emailResult = { ok: false, error: message };
        console.error("Order confirmation email failed", err);
      }
    }
  }
  return { orderId, emailAttempted, emailResult };
}

export async function recordCheckoutTotalMismatch(params: {
  stripeCheckoutSessionId: string;
  stripeAmountTotalCents: number | null;
  stripeCurrency: string | null;
}) {
  await ensureCheckoutSessionsTable();
  const { stripeCheckoutSessionId, stripeAmountTotalCents, stripeCurrency } = params;
  if (!stripeCheckoutSessionId) return { ok: false as const, reason: "missing_session_id" };
  if (stripeAmountTotalCents == null) return { ok: false as const, reason: "missing_amount_total" };

  const rows = (await sql`
    SELECT total_cents, currency, contact
    FROM public.checkout_sessions
    WHERE stripe_checkout_session_id = ${stripeCheckoutSessionId}
    LIMIT 1
  `) as Array<{ total_cents: number | null; currency: string | null; contact: unknown }>;

  const row = rows[0];
  if (!row) return { ok: false as const, reason: "checkout_not_found" };

  const expectedTotalCents = row.total_cents;
  if (expectedTotalCents == null) return { ok: false as const, reason: "missing_expected_total" };

  if (expectedTotalCents === stripeAmountTotalCents) {
    return { ok: true as const, mismatch: false as const };
  }

  await sql`
    UPDATE public.checkout_sessions
    SET contact = jsonb_set(
      COALESCE(contact, '{}'::jsonb),
      '{pricing_check}',
      to_jsonb(json_build_object(
        'expected_total_cents', ${expectedTotalCents},
        'stripe_amount_total_cents', ${stripeAmountTotalCents},
        'stripe_currency', ${stripeCurrency ?? row.currency ?? "usd"},
        'checked_at', now()
      )),
      true
    )
    WHERE stripe_checkout_session_id = ${stripeCheckoutSessionId}
      AND (COALESCE(contact, '{}'::jsonb) -> 'pricing_check') IS NULL
  `;

  return {
    ok: true as const,
    mismatch: true as const,
    expected_total_cents: expectedTotalCents,
    stripe_amount_total_cents: stripeAmountTotalCents,
  };
}
