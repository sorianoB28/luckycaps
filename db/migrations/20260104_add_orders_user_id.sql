-- Adds a nullable link between orders and users for account-linked purchases.
-- Safe to run multiple times.

-- 1) Column (uuid)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS user_id uuid;

-- If the column existed as text/varchar, normalize to uuid when possible.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'user_id'
      AND data_type IN ('text', 'character varying')
  ) THEN
    ALTER TABLE public.orders
      ALTER COLUMN user_id TYPE uuid
      USING NULLIF(user_id::text, '')::uuid;
  END IF;
END $$;

-- 2) Index
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders (user_id);

-- 3) Foreign key (nullable, sets to null on user deletion)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_user_id_fkey'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.users (id)
      ON DELETE SET NULL;
  END IF;
END $$;

