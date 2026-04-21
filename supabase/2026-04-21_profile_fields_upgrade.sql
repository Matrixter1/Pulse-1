-- ============================================================
-- Pulse by Matrixter - Shared profile expansion
-- Run this in the Supabase SQL Editor against the live project
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS nickname TEXT,
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_tier_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_tier_check
  CHECK (tier IN ('guest', 'registered', 'verified', 'admin'));

UPDATE public.users
SET
  display_name = COALESCE(NULLIF(TRIM(display_name), ''), NULLIF(TRIM(nickname), '')),
  nickname = COALESCE(NULLIF(TRIM(nickname), ''), NULLIF(TRIM(display_name), ''))
WHERE
  display_name IS NULL
  OR nickname IS NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    display_name,
    nickname,
    first_name,
    last_name,
    country,
    tier
  )
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
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    display_name = COALESCE(public.users.display_name, EXCLUDED.display_name),
    nickname = COALESCE(public.users.nickname, EXCLUDED.nickname),
    first_name = COALESCE(public.users.first_name, EXCLUDED.first_name),
    last_name = COALESCE(public.users.last_name, EXCLUDED.last_name),
    country = COALESCE(public.users.country, EXCLUDED.country);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

UPDATE public.users pu
SET
  email = COALESCE(pu.email, au.email),
  display_name = COALESCE(
    NULLIF(TRIM(pu.display_name), ''),
    NULLIF(TRIM(pu.nickname), ''),
    NULLIF(TRIM(COALESCE(au.raw_user_meta_data ->> 'display_name', au.raw_user_meta_data ->> 'nickname')), '')
  ),
  nickname = COALESCE(
    NULLIF(TRIM(pu.nickname), ''),
    NULLIF(TRIM(pu.display_name), ''),
    NULLIF(TRIM(COALESCE(au.raw_user_meta_data ->> 'display_name', au.raw_user_meta_data ->> 'nickname')), '')
  ),
  first_name = COALESCE(
    NULLIF(TRIM(pu.first_name), ''),
    NULLIF(TRIM(au.raw_user_meta_data ->> 'first_name'), '')
  ),
  last_name = COALESCE(
    NULLIF(TRIM(pu.last_name), ''),
    NULLIF(TRIM(au.raw_user_meta_data ->> 'last_name'), '')
  ),
  country = COALESCE(
    NULLIF(TRIM(pu.country), ''),
    NULLIF(TRIM(au.raw_user_meta_data ->> 'country'), '')
  )
FROM auth.users au
WHERE pu.id = au.id;
