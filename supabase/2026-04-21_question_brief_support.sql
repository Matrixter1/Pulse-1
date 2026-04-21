-- ============================================================
-- Pulse by Matrixter - Question brief / more insights support
-- Run this in the Supabase SQL Editor
-- ============================================================

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS brief JSONB;
