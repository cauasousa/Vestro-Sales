-- ============================================================
-- newsletter_subscribers
-- ============================================================

insert into public.newsletter_subscribers (email, subscribed_at)
values
  ('alex.rivera@example.com', '2026-08-10T14:22:00Z'),
  ('jamie.chen@example.com', '2026-08-12T09:05:00Z'),
  ('taylor.morgan@example.com', '2026-08-13T16:47:00Z')
on conflict (email) do nothing;
