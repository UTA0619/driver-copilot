-- Development seed data
-- Run with: supabase db seed

-- Seed a test user profile (matches local Supabase auth test user)
INSERT INTO user_profiles (id, email, platforms, primary_city, is_pro, onboarding_completed_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'test@drivercopilot.dev',
  ARRAY['uber_eats', 'doordash'],
  'Los Angeles',
  false,
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Seed sample deliveries for test user
INSERT INTO deliveries (user_id, platform, payout, tip, distance_miles, duration_minutes, started_at, ended_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'uber_eats', 8.50, 3.00, 2.1, 22, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '22 minutes'),
  ('00000000-0000-0000-0000-000000000001', 'doordash', 12.00, 5.00, 3.5, 30, NOW() - INTERVAL '1 day' + INTERVAL '30 minutes', NOW() - INTERVAL '1 day' + INTERVAL '60 minutes'),
  ('00000000-0000-0000-0000-000000000001', 'uber_eats', 6.75, 2.00, 1.8, 18, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours' + INTERVAL '18 minutes')
ON CONFLICT DO NOTHING;
