CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.parcel_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  length numeric NOT NULL,
  width numeric NOT NULL,
  height numeric NOT NULL,
  weight numeric,
  distance_unit text NOT NULL DEFAULT 'in',
  mass_unit text NOT NULL DEFAULT 'oz',
  min_items int,
  max_items int,
  tags jsonb,
  label_format_default text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.parcel_templates
  ADD COLUMN IF NOT EXISTS length numeric;

ALTER TABLE public.parcel_templates
  ADD COLUMN IF NOT EXISTS width numeric;

ALTER TABLE public.parcel_templates
  ADD COLUMN IF NOT EXISTS height numeric;

ALTER TABLE public.parcel_templates
  ADD COLUMN IF NOT EXISTS weight numeric;

ALTER TABLE public.parcel_templates
  ADD COLUMN IF NOT EXISTS distance_unit text;

ALTER TABLE public.parcel_templates
  ADD COLUMN IF NOT EXISTS mass_unit text;

ALTER TABLE public.parcel_templates
  ADD COLUMN IF NOT EXISTS min_items int;

ALTER TABLE public.parcel_templates
  ADD COLUMN IF NOT EXISTS max_items int;

ALTER TABLE public.parcel_templates
  ADD COLUMN IF NOT EXISTS tags jsonb;

ALTER TABLE public.parcel_templates
  ADD COLUMN IF NOT EXISTS label_format_default text;

ALTER TABLE public.parcel_templates
  ADD COLUMN IF NOT EXISTS created_at timestamptz;

ALTER TABLE public.parcel_templates
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'parcel_templates'
      AND column_name = 'length_in'
  ) THEN
    UPDATE public.parcel_templates
    SET
      length = COALESCE(length, length_in),
      width = COALESCE(width, width_in),
      height = COALESCE(height, height_in),
      distance_unit = COALESCE(distance_unit, 'in')
    WHERE length IS NULL
      OR width IS NULL
      OR height IS NULL
      OR distance_unit IS NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'parcel_templates'
      AND column_name = 'weight_oz'
  ) THEN
    UPDATE public.parcel_templates
    SET
      weight = COALESCE(weight, weight_oz),
      mass_unit = COALESCE(mass_unit, 'oz')
    WHERE weight IS NULL
      OR mass_unit IS NULL;
  END IF;
END $$;

ALTER TABLE public.parcel_templates
  ALTER COLUMN distance_unit SET DEFAULT 'in';

ALTER TABLE public.parcel_templates
  ALTER COLUMN mass_unit SET DEFAULT 'oz';

ALTER TABLE public.parcel_templates
  ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE public.parcel_templates
  ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS parcel_template_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'shipments_parcel_template_id_fkey'
  ) THEN
    ALTER TABLE public.shipments
      ADD CONSTRAINT shipments_parcel_template_id_fkey
      FOREIGN KEY (parcel_template_id)
      REFERENCES public.parcel_templates (id)
      ON DELETE SET NULL;
  END IF;
END $$;

INSERT INTO public.parcel_templates (
  name,
  length,
  width,
  height,
  weight,
  distance_unit,
  mass_unit,
  min_items,
  max_items,
  tags,
  label_format_default
)
SELECT
  'Cap - Single',
  8,
  8,
  4,
  8,
  'in',
  'oz',
  1,
  1,
  '["cap","hat","caps"]'::jsonb,
  'PDF_4x6'
WHERE NOT EXISTS (
  SELECT 1 FROM public.parcel_templates WHERE name = 'Cap - Single'
);

INSERT INTO public.parcel_templates (
  name,
  length,
  width,
  height,
  weight,
  distance_unit,
  mass_unit,
  min_items,
  max_items,
  tags,
  label_format_default
)
SELECT
  'Cap - 2 hats',
  10,
  8,
  6,
  16,
  'in',
  'oz',
  2,
  2,
  '["cap","hat","caps"]'::jsonb,
  'PDF_4x6'
WHERE NOT EXISTS (
  SELECT 1 FROM public.parcel_templates WHERE name = 'Cap - 2 hats'
);

INSERT INTO public.parcel_templates (
  name,
  length,
  width,
  height,
  weight,
  distance_unit,
  mass_unit,
  min_items,
  max_items,
  tags,
  label_format_default
)
SELECT
  'Cap - 3-4 hats',
  12,
  10,
  8,
  32,
  'in',
  'oz',
  3,
  4,
  '["cap","hat","caps"]'::jsonb,
  'PDF_4x6'
WHERE NOT EXISTS (
  SELECT 1 FROM public.parcel_templates WHERE name = 'Cap - 3-4 hats'
);

INSERT INTO public.parcel_templates (
  name,
  length,
  width,
  height,
  weight,
  distance_unit,
  mass_unit,
  min_items,
  max_items,
  tags,
  label_format_default
)
SELECT
  'Soft goods mailer',
  10,
  13,
  2,
  12,
  'in',
  'oz',
  1,
  4,
  '["soft","softgoods","apparel","shirt","hoodie"]'::jsonb,
  'PDF_4x6'
WHERE NOT EXISTS (
  SELECT 1 FROM public.parcel_templates WHERE name = 'Soft goods mailer'
);
