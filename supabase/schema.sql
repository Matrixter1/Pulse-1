-- ============================================================
-- Pulse by Matrixter — Supabase Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  tier TEXT NOT NULL DEFAULT 'registered' CHECK (tier IN ('guest', 'registered', 'verified')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Questions table
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Consumer', 'Health', 'Spirituality', 'Politics', 'Technology')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Votes table
CREATE TABLE IF NOT EXISTS public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  spectrum_value INTEGER NOT NULL CHECK (spectrum_value >= 0 AND spectrum_value <= 100),
  reason TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(question_id, user_id)  -- one vote per user per question
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- Users: read own row, insert own row
CREATE POLICY "Users can read their own data"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own data"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own data"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Questions: anyone can read
CREATE POLICY "Questions are publicly readable"
  ON public.questions FOR SELECT
  TO public
  USING (TRUE);

-- Votes: anyone can read (for public results), only authenticated users can insert
CREATE POLICY "Votes are publicly readable"
  ON public.votes FOR SELECT
  TO public
  USING (TRUE);

CREATE POLICY "Authenticated users can insert votes"
  ON public.votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Seed Data — 6 Sample Questions
-- ============================================================

INSERT INTO public.questions (text, category) VALUES
  (
    'Brands that take a public political stance lose my trust as a customer.',
    'Consumer'
  ),
  (
    'I would share my health data with AI systems if it meaningfully improved my personal care.',
    'Health'
  ),
  (
    'Modern science and ancient spiritual traditions are fundamentally compatible worldviews.',
    'Spirituality'
  ),
  (
    'Anonymous online voting in national elections would increase genuine democratic participation.',
    'Politics'
  ),
  (
    'AI-generated content should carry a permanent, unremovable watermark visible to all viewers.',
    'Technology'
  ),
  (
    'I would pay a premium subscription for social media that shows me verified-only content.',
    'Consumer'
  )
ON CONFLICT DO NOTHING;

-- ============================================================
-- Optional: Seed demo votes for testing
-- (comment out if you want a clean slate)
-- ============================================================

-- You can manually add demo votes through the app once you have
-- registered users, or use the Supabase dashboard to insert rows
-- directly into the votes table for testing purposes.
