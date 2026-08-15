-- ============================================================
-- chat_messages
-- ============================================================

insert into public.chat_messages (conversation_id, sender, text, created_at)
values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'customer', 'Hi! I have a question about my order.', '2026-08-14T08:00:00Z'),
  ('bbbbbbbb-0000-4000-8000-000000000001', 'admin', 'Sure, happy to help — what''s the order number?', '2026-08-14T08:05:00Z'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'customer', 'Does this come in other colors?', '2026-08-14T09:30:00Z');
