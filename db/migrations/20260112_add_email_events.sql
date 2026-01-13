ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_confirmation_sent_at timestamptz;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_confirmation_sent_at timestamptz;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS last_email_error text;

CREATE TABLE IF NOT EXISTS public.email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  event_type text NOT NULL,
  to_email text NOT NULL,
  locale text,
  provider text NOT NULL,
  status text NOT NULL,
  provider_message_id text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS email_events_order_event_uidx
  ON public.email_events (order_id, event_type);
