-- ============================================================
-- conversations
-- One support thread per demo customer, mirroring the seed pattern
-- already used by src/lib/chat-store.ts (Alex Rivera, Jamie Chen).
-- ============================================================

insert into public.conversations (id, customer_id, customer_name, created_at)
values
  ('bbbbbbbb-0000-4000-8000-000000000001', '22222222-2222-2222-2222-222222222222', 'Alex Rivera', '2026-08-14T08:00:00Z'),
  ('bbbbbbbb-0000-4000-8000-000000000002', '33333333-3333-3333-3333-333333333333', 'Jamie Chen', '2026-08-14T09:30:00Z');
