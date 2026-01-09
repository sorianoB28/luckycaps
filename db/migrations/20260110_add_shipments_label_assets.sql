ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS shippo_transaction_id text;

ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS label_asset_url text;
