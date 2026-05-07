# Pulse Media Migration Plan

Pulse should keep Supabase for auth, questions, votes, and profile data. Heavy media
should move to a media platform so storage delivery does not consume Supabase cached
egress.

## Current Safe State

- `image_url` remains the full/detail media URL.
- `thumbnail_url` is the feed/card poster URL and should be lightweight.
- Feed and archive cards prefer `thumbnail_url`, then fall back to `image_url`.
- Question detail pages can still use `image_url`.
- Web Admin can upload through a configurable media provider.

## Preferred First Provider

Cloudinary or ImageKit is the lowest-friction next step because they can create optimized
delivery URLs and thumbnails. Cloudflare R2 is a stronger long-term storage option, but
needs a separate compression/thumbnail pipeline.

## Web Admin Switch

Set these environment variables on the Pulse web host:

```env
VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UPLOAD_PRESET=
VITE_CLOUDINARY_FOLDER=pulse/questions
```

When set, Admin uploads media to Cloudinary and stores:

- `image_url`: optimized full media delivery URL.
- `thumbnail_url`: optimized feed thumbnail/poster URL.

When not set, Admin falls back to the current Supabase Storage upload path.

## Next Implementation Steps

1. Create a restricted unsigned Cloudinary upload preset or equivalent provider setup.
2. Add the environment variables to the Pulse hosting platform.
3. Test one image and one MP4 upload from Admin.
4. Backfill `thumbnail_url` for existing media-heavy questions.
5. Later, add the same provider switch to Pulse Mobile before the next APK build.

## Operating Rule

Feed surfaces should never load full MP4s. They should show thumbnail/poster media only,
then load full media after the user opens the question.
