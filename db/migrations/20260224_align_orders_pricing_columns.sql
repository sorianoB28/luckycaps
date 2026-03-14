-- Ensures order pricing columns exist and are normalized for checkout finalization/email totals.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS subtotal_cents int;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS discount_cents int;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_cents int;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tax_cents int;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS total_cents int;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS currency text;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text;

UPDATE public.orders
SET
  subtotal_cents = COALESCE(subtotal_cents, 0),
  discount_cents = COALESCE(discount_cents, 0),
  shipping_cents = COALESCE(shipping_cents, 0),
  tax_cents = COALESCE(tax_cents, 0),
  total_cents = COALESCE(
    total_cents,
    COALESCE(subtotal_cents, 0) - COALESCE(discount_cents, 0) + COALESCE(shipping_cents, 0) + COALESCE(tax_cents, 0)
  ),
  currency = COALESCE(NULLIF(currency, ''), 'usd')
WHERE
  subtotal_cents IS NULL
  OR discount_cents IS NULL
  OR shipping_cents IS NULL
  OR tax_cents IS NULL
  OR total_cents IS NULL
  OR currency IS NULL
  OR currency = '';

ALTER TABLE public.orders
  ALTER COLUMN subtotal_cents SET DEFAULT 0,
  ALTER COLUMN discount_cents SET DEFAULT 0,
  ALTER COLUMN shipping_cents SET DEFAULT 0,
  ALTER COLUMN tax_cents SET DEFAULT 0,
  ALTER COLUMN total_cents SET DEFAULT 0,
  ALTER COLUMN currency SET DEFAULT 'usd';

ALTER TABLE public.orders
  ALTER COLUMN subtotal_cents SET NOT NULL,
  ALTER COLUMN discount_cents SET NOT NULL,
  ALTER COLUMN shipping_cents SET NOT NULL,
  ALTER COLUMN tax_cents SET NOT NULL,
  ALTER COLUMN total_cents SET NOT NULL,
  ALTER COLUMN currency SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS orders_stripe_checkout_session_id_uidx
  ON public.orders (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;
