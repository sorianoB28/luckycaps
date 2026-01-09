CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS label_asset_provider text;

ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS label_asset_public_id text;

ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS label_purchased_at timestamptz;

ALTER TABLE public.shipments
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS shipments_order_id_key
  ON public.shipments (order_id);
