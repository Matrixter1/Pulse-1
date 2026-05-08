-- Pulse legacy media audit
-- Run this before deleting any old Supabase Storage files.
-- Expected safe result after Cloudinary migration: 0 rows.

SELECT
  id,
  text,
  image_url,
  thumbnail_url
FROM public.questions
WHERE
  COALESCE(image_url, '') ILIKE '%supabase.co/storage/v1/object/public%'
  OR COALESCE(thumbnail_url, '') ILIKE '%supabase.co/storage/v1/object/public%'
ORDER BY created_at DESC;

-- Optional storage inventory. This only lists files; it does not delete anything.
SELECT
  bucket_id,
  name,
  created_at,
  updated_at,
  metadata
FROM storage.objects
WHERE bucket_id = 'question-images'
ORDER BY updated_at DESC NULLS LAST, created_at DESC;
