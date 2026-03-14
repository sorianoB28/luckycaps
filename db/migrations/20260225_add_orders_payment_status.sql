ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status text;

UPDATE public.orders
SET payment_status = CASE
  WHEN status = 'refunded' THEN 'refunded'
  WHEN status IN ('paid', 'shipped', 'delivered') THEN 'paid'
  ELSE 'unpaid'
END
WHERE payment_status IS NULL
   OR payment_status = '';

ALTER TABLE public.orders
  ALTER COLUMN payment_status SET DEFAULT 'unpaid';

ALTER TABLE public.orders
  ALTER COLUMN payment_status SET NOT NULL;
