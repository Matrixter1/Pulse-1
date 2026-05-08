# Pulse Cloudinary Media Policy

Pulse uses Supabase for auth, question data, votes, profiles, and admin workflows.
Question media should live in Cloudinary so images and videos do not consume Supabase
cached egress.

## Storage Rules

- `image_url` stores the full/detail media URL.
- `thumbnail_url` stores the lightweight feed poster URL.
- Feed, archive, and preview surfaces should use `thumbnail_url` first.
- Vote and result detail pages may load `image_url` after the user opens a question.
- Feed surfaces should never load a full MP4.

## Standard Delivery Variants

Use a small fixed set of transformations. Every unique transformation creates another
derived asset, so avoid one-off sizes unless there is a clear product reason.

| Surface | Resource | Transformation |
| --- | --- | --- |
| Feed/card image | image | `w_900,c_limit,q_auto:eco,f_auto` |
| Detail image | image | `w_1800,c_limit,q_auto:good,f_auto` |
| Feed/card video poster | video | `so_0,w_900,c_limit,q_auto:eco,f_jpg` |
| Detail video | video | `q_auto:eco` |

## Upload Guidance

- Images: prefer JPG, PNG, WEBP, or GIF under 10 MB.
- Videos: prefer MP4 or WEBM under 100 MB.
- Short videos are best for Pulse. Aim for 5-20 seconds where possible.
- Add a thumbnail URL when importing by spreadsheet if a custom poster is needed.
- Avoid uploading the same large source repeatedly; replace the question media only when needed.

## Admin Environment

Pulse Admin uploads to Cloudinary when these Vercel environment variables are set:

```env
VITE_CLOUDINARY_CLOUD_NAME=daaj3tadw
VITE_CLOUDINARY_UPLOAD_PRESET=pulse_admin_unsigned
VITE_CLOUDINARY_FOLDER=pulse/questions
```

If these are missing, Admin falls back to Supabase Storage. That fallback is useful for
local development, but production should keep Cloudinary configured.

## Migration Checkpoint

Post-migration export checked on 2026-05-08:

- Workbook rows: 105
- Rows with Cloudinary media: 32
- Supabase storage references in export: 0

## Supabase Storage Cleanup Rule

Do not delete old Supabase Storage files until all of these are true:

- The latest Excel export has zero `supabase.co/storage/v1/object/public` references.
- The live Admin `Move Media` button shows no remaining legacy Supabase media.
- Feed, Vote, Results, and Admin preview pages have been checked after deployment.
- A backup export exists locally.

After cleanup, keep Supabase for database/auth. Only old question media objects should be removed.
