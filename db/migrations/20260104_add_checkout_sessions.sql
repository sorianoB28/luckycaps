-- Stores pending checkout payloads until Stripe payment succeeds.
-- Orders are created only after successful payment.

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
  subtotal_cents int NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  items jsonb NOT NULL,
  order_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS checkout_sessions_user_id_idx ON public.checkout_sessions (user_id);
CREATE INDEX IF NOT EXISTS checkout_sessions_created_at_idx ON public.checkout_sessions (created_at);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'checkout_sessions_user_id_fkey'
  ) THEN
    ALTER TABLE public.checkout_sessions
      ADD CONSTRAINT checkout_sessions_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.users (id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'checkout_sessions_order_id_fkey'
  ) THEN
    ALTER TABLE public.checkout_sessions
      ADD CONSTRAINT checkout_sessions_order_id_fkey
      FOREIGN KEY (order_id)
      REFERENCES public.orders (id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Recommended for idempotency under concurrency.
CREATE UNIQUE INDEX IF NOT EXISTS orders_stripe_checkout_session_id_uidx
  ON public.orders (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

