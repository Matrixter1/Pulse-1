-- ============================================================
-- Pulse by Matrixter — Auto-create public.users on signup
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. The handler function
--    SECURITY DEFINER means it runs as the postgres superuser,
--    bypassing RLS entirely — this is intentional and safe here
--    because it only ever writes a single row keyed to the new
--    auth user's own UUID.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, nickname, first_name, last_name, country, tier)
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'nickname')), ''),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'nickname')), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'first_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'last_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'country'), ''),
    'registered'
  )
  ON CONFLICT (id) DO NOTHING;  -- idempotent: safe to re-run

  RETURN NEW;
END;
$$;

-- 2. The trigger — fires AFTER every INSERT on auth.users
--    (i.e. every new Supabase Auth signup, OAuth, magic link, etc.)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Backfill: create profile rows for any auth users that
-- already exist but have no public.users row yet
-- (safe to run multiple times — ON CONFLICT DO NOTHING)
-- ============================================================
INSERT INTO public.users (id, email, display_name, nickname, first_name, last_name, country, tier)
SELECT
  au.id,
  au.email,
  NULLIF(TRIM(COALESCE(au.raw_user_meta_data ->> 'display_name', au.raw_user_meta_data ->> 'nickname')), ''),
  NULLIF(TRIM(COALESCE(au.raw_user_meta_data ->> 'display_name', au.raw_user_meta_data ->> 'nickname')), ''),
  NULLIF(TRIM(au.raw_user_meta_data ->> 'first_name'), ''),
  NULLIF(TRIM(au.raw_user_meta_data ->> 'last_name'), ''),
  NULLIF(TRIM(au.raw_user_meta_data ->> 'country'), ''),
  'registered'
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;
