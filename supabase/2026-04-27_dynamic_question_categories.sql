-- Allow Pulse question categories to be managed through Admin/import content.
-- This keeps categories non-empty without requiring a code/database change for
-- every new editorial category.

ALTER TABLE public.questions
  DROP CONSTRAINT IF EXISTS questions_category_check;

ALTER TABLE public.questions
  DROP CONSTRAINT IF EXISTS questions_category_not_empty_check;

ALTER TABLE public.questions
  ADD CONSTRAINT questions_category_not_empty_check
  CHECK (length(btrim(category)) > 0);
