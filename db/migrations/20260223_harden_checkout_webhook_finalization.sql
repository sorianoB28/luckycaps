-- Hardens checkout finalization schema and adds webhook replay dedupe table.

ALTER TABLE public.checkout_sessions
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text;

ALTER TABLE public.checkout_sessions
  ADD COLUMN IF NOT EXISTS discount_cents int;

ALTER TABLE public.checkout_sessions
  ADD COLUMN IF NOT EXISTS subtotal_cents int;

ALTER TABLE public.checkout_sessions
  ADD COLUMN IF NOT EXISTS shipping_cents int;

ALTER TABLE public.checkout_sessions
  ADD COLUMN IF NOT EXISTS shipping_currency text;

ALTER TABLE public.checkout_sessions
  ADD COLUMN IF NOT EXISTS tax_cents int;

ALTER TABLE public.checkout_sessions
  ADD COLUMN IF NOT EXISTS total_cents int;

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
  OR shipping_currency = '';

ALTER TABLE public.checkout_sessions
  ALTER COLUMN discount_cents SET DEFAULT 0,
  ALTER COLUMN subtotal_cents SET DEFAULT 0,
  ALTER COLUMN shipping_cents SET DEFAULT 0,
  ALTER COLUMN tax_cents SET DEFAULT 0,
  ALTER COLUMN total_cents SET DEFAULT 0,
  ALTER COLUMN shipping_currency SET DEFAULT 'USD';

ALTER TABLE public.checkout_sessions
  ALTER COLUMN discount_cents SET NOT NULL,
  ALTER COLUMN subtotal_cents SET NOT NULL,
  ALTER COLUMN shipping_cents SET NOT NULL,
  ALTER COLUMN total_cents SET NOT NULL,
  ALTER COLUMN shipping_currency SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS checkout_sessions_stripe_checkout_session_id_uidx
  ON public.checkout_sessions (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  stripe_checkout_session_id text,
  processed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stripe_webhook_events_session_idx
  ON public.stripe_webhook_events (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;
