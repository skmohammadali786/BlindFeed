# Supabase migration notes

## Required setup

1. Create a Supabase project.
2. Configure Auth (email/password provider enabled).
3. Create storage buckets:
   - private bucket (e.g. `blindfeed-private`)
   - public bucket (e.g. `blindfeed-public`)
4. Apply SQL migrations in `supabase/migrations`.

## Environment variables

### API server (`artifacts/api-server`)

Use `.env.example` as reference:

- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_PRIVATE_BUCKET`
- `SUPABASE_STORAGE_PUBLIC_BUCKETS`
- `CORS_ALLOWED_ORIGINS`
- `ADMIN_KEY`

### Mobile (`artifacts/mobile`)

Use `.env.example` as reference:

- `EXPO_PUBLIC_API_URL`

## Behavior changes in this migration

- Auth routes now use Supabase Auth (`/auth/register`, `/auth/login`).
- API requests can authenticate with `Authorization: Bearer <access_token>`.
- Storage upload URLs are generated from Supabase Storage signed upload URLs.
- `/storage/objects/*` now redirects to Supabase signed read URLs.
- Admin routes only honor `x-admin-key` (query-string secrets removed).
