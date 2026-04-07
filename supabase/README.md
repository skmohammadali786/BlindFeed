# Supabase migration notes

## Required setup

1. Create a Supabase project.
2. Configure Auth (email/password provider enabled).
3. Create storage buckets:
   - private bucket (e.g. `blindfeed-private`)
   - public bucket (e.g. `blindfeed-public`)
4. Apply SQL migrations in `supabase/migrations`.
5. Start the API server with the required env configured.
6. Start mobile with `EXPO_PUBLIC_API_URL` pointing to your API server.

## Environment variables

### API server (`artifacts/api-server`)

Use `.env.example` as reference. Required to start:

- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional (required only for related features):

- `SUPABASE_STORAGE_PRIVATE_BUCKET` (private uploads)
- `SUPABASE_STORAGE_PUBLIC_BUCKETS` (public asset URLs)
- `CORS_ALLOWED_ORIGINS` (allow specific cross-origin browser clients)
- `ADMIN_KEY` (admin-only endpoints)

### Mobile (`artifacts/mobile`)

Use `.env.example` as reference:

- `EXPO_PUBLIC_API_URL`

## Behavior changes in this migration

- Auth routes now use Supabase Auth (`/auth/register`, `/auth/login`).
- Session refresh is supported via `/auth/refresh` (mobile retries once on 401 using stored refresh token).
- API requests can authenticate with `Authorization: Bearer <access_token>`.
- Storage upload URLs are generated from Supabase Storage signed upload URLs.
- `/storage/objects/*` now redirects to Supabase signed read URLs.
- Storage paths are normalized and path traversal segments (`..`, `.`, empty segments, backslashes, null bytes) are rejected.
- Private object signed reads are restricted to the expected `uploads/` namespace.
- Admin routes only honor `x-admin-key` (query-string secrets removed).
- Token-auth middleware auto-links local users by email when `users.supabase_user_id` is missing, then persists the link.

## End-to-end verification checklist

1. Register in app (`/auth/register`) and confirm `accessToken`/`refreshToken` are returned.
2. Log in (`/auth/login`) and confirm authenticated routes (create post, react, comment, report) work with `Authorization: Bearer <token>`.
3. Remove/expire access token and confirm app refreshes session via `/auth/refresh`.
4. Request upload URL (`/storage/uploads/request-url`) with auth token and upload a file.
5. Fetch private object through `/storage/objects/*` and confirm signed redirect works.
