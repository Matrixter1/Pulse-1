-- Optional media-cost shield for Pulse.
-- Feed surfaces should use thumbnail_url when present, while detail screens
-- continue to use image_url for the full image/video.

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
