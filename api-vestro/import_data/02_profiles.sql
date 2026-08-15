-- ============================================================
-- profiles (via auth.users)
-- DEV/DEMO SEED ONLY — see the warning in 00_README.md.
-- Inserting into auth.users directly is a common local-dev seed
-- trick (uses pgcrypto to hash the password), not the recommended
-- production flow (use supabase.auth.admin.createUser instead).
--
-- Password for all 3 demo users: demo123
-- ============================================================

create extension if not exists pgcrypto;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, last_sign_in_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated',
   'admin@vestro.com', crypt('demo123', gen_salt('bf')), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Admin Vestro"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated',
   'alex.rivera@example.com', crypt('demo123', gen_salt('bf')), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Alex Rivera"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated',
   'jamie.chen@example.com', crypt('demo123', gen_salt('bf')), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Jamie Chen"}',
   now(), now(), '', '', '', '')
on conflict (id) do nothing;

-- Matching identity row so email/password sign-in works (required by
-- newer GoTrue versions). Skip this block if your project's auth
-- schema rejects it — password login isn't needed for the seed data
-- itself, only profiles.id needs to exist.
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
   '{"sub":"11111111-1111-1111-1111-111111111111","email":"admin@vestro.com"}', 'email', now(), now(), now()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222',
   '{"sub":"22222222-2222-2222-2222-222222222222","email":"alex.rivera@example.com"}', 'email', now(), now(), now()),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333',
   '{"sub":"33333333-3333-3333-3333-333333333333","email":"jamie.chen@example.com"}', 'email', now(), now(), now())
on conflict do nothing;

-- The on_auth_user_created trigger (schema.sql) already inserted a row
-- into public.profiles for each user above with role='customer' and
-- full_name from raw_user_meta_data. This just promotes the admin one.
update public.profiles set role = 'admin' where email = 'admin@vestro.com';
