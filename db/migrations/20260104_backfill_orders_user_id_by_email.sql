-- Optional one-time backfill:
-- Link past guest orders to accounts when the order email matches a user email exactly.
-- Review before running in production.

UPDATE public.orders o
SET user_id = u.id
FROM public.users u
WHERE o.user_id IS NULL
  AND o.email IS NOT NULL
  AND lower(o.email) = lower(u.email);

