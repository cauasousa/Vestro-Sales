-- ============================================================
-- products
-- Same 8 items already shown by the frontend mock data
-- (src/app/(app)/(public)/data/products.ts), so imported data
-- matches what the UI already displays.
-- ============================================================

insert into public.products (name, description, category, price, stock, image_url, is_active, created_at, updated_at)
values
  ('Compact Mechanical Keyboard', '65% keyboard with tactile switches and minimalist aluminum frame.', 'accessories', 89.90, 18,
    'https://images.pexels.com/photos/1122528/pexels-photo-1122528.jpeg', true, '2026-01-15T12:00:00Z', '2026-01-15T12:00:00Z'),
  ('Keyboard and Mouse Set', 'Perfect combo for workstations with a quiet mechanical keyboard and precision mouse.', 'desk', 129.90, 12,
    'https://media.istockphoto.com/id/1424045154/pt/foto/unbranded-black-qwerty-keyboard-with-unbranded-black-mouse-and-cables-on-a-white-office-desk.jpg', true, '2026-01-16T12:00:00Z', '2026-01-16T12:00:00Z'),
  ('Yellow Wireless Mouse', 'Bright, ergonomic and responsive for long work sessions or creative tasks.', 'work', 34.90, 26,
    'https://media.istockphoto.com/id/187937835/pt/foto/amarelo-rato-de-computador.jpg', true, '2026-01-17T12:00:00Z', '2026-01-17T12:00:00Z'),
  ('Mobile Phone Stand', 'Compact stand designed to keep your phone visible and accessible while working.', 'mobile', 24.90, 40,
    'https://images.pexels.com/photos/11031440/pexels-photo-11031440.png', true, '2026-01-18T12:00:00Z', '2026-01-18T12:00:00Z'),
  ('Wi-Fi Router Pro', 'Stable dual-band router for balanced home or office internet performance.', 'network', 149.90, 9,
    'https://media.istockphoto.com/id/1270583054/pt/foto/selective-focus-at-router-internet-router-on-working-table-with-blurred-man-connect-the-cable.jpg', true, '2026-01-19T12:00:00Z', '2026-01-19T12:00:00Z'),
  ('Protective Phone Case', 'Slim and durable case made to protect your device without adding bulk.', 'mobile', 19.90, 54,
    'https://images.pexels.com/photos/32912373/pexels-photo-32912373.jpeg', true, '2026-01-20T12:00:00Z', '2026-01-20T12:00:00Z'),
  ('ATX Motherboard', 'Versatile motherboard with expansion options for compact high-performance setups.', 'work', 189.90, 7,
    'https://images.pexels.com/photos/3665443/pexels-photo-3665443.jpeg', true, '2026-01-21T12:00:00Z', '2026-01-21T12:00:00Z'),
  ('Core i5 Processor', 'Balanced CPU for day-to-day productivity and multimedia performance.', 'work', 219.90, 5,
    'https://images.pexels.com/photos/37368170/pexels-photo-37368170.jpeg', true, '2026-01-22T12:00:00Z', '2026-01-22T12:00:00Z');
