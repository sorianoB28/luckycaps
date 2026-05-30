CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.manual_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'shippo',
  status text NOT NULL DEFAULT 'draft',
  recipient jsonb NOT NULL,
  parcel jsonb NOT NULL,
  rates jsonb NOT NULL DEFAULT '[]'::jsonb,
  selected_rate jsonb,
  provider_shipment_id text,
  provider_rate_id text,
  label_url text,
  tracking_number text,
  tracking_url text,
  postage_amount numeric,
  postage_currency text,
  label_format text,
  shippo_transaction_id text,
  label_asset_url text,
  label_asset_provider text,
  label_asset_public_id text,
  label_purchased_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS manual_shipments_created_at_idx
  ON public.manual_shipments (created_at DESC);
