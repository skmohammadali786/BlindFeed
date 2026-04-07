alter table if exists public.users
  add column if not exists supabase_user_id text;

create unique index if not exists users_supabase_user_id_uq
  on public.users (supabase_user_id)
  where supabase_user_id is not null;
