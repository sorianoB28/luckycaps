CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS postage_amount numeric;

ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS postage_currency text;

ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS label_url text;

ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS tracking_number text;

ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS tracking_url text;

ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS selected_rate jsonb;

ALTER TABLE public.shipments
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
