-- ─── zone_performance seed data ───────────────────────────────────────────────
-- Realistic H3 resolution-8 cells for 4 US metro areas × 4 time slots.
-- Run via: supabase db reset  (or paste into SQL Editor for production seeding)
--
-- Payout ranges reflect 2024 gig-economy averages:
--   High:    $14–$22  (green)
--   Medium:  $10–$13  (amber)
--   Low:      $6–$ 9  (red)

INSERT INTO zone_performance
  (h3_index, time_of_day, avg_payout, avg_wait_minutes, sample_count, updated_at)
VALUES

-- ── Manhattan, NYC ─────────────────────────────────────────────────────────
('882a100d55fffff', 'morning',    18.50, 3.2, 142, now()),
('882a100d57fffff', 'morning',    16.80, 4.1,  98, now()),
('882a100d53fffff', 'morning',    14.20, 5.0,  76, now()),
('882a100d51fffff', 'morning',     9.40, 6.8,  44, now()),
('882a100d59fffff', 'morning',    21.30, 2.5, 210, now()),

('882a100d55fffff', 'lunch',      22.10, 2.1, 195, now()),
('882a100d57fffff', 'lunch',      19.60, 2.8, 163, now()),
('882a100d53fffff', 'lunch',      17.40, 3.5, 130, now()),
('882a100d51fffff', 'lunch',      12.80, 5.2,  87, now()),
('882a100d59fffff', 'lunch',      24.50, 1.8, 278, now()),

('882a100d55fffff', 'dinner',     20.80, 2.4, 231, now()),
('882a100d57fffff', 'dinner',     18.20, 3.0, 184, now()),
('882a100d53fffff', 'dinner',     15.60, 4.2, 147, now()),
('882a100d51fffff', 'dinner',     11.30, 5.8,  92, now()),
('882a100d59fffff', 'dinner',     23.70, 1.9, 312, now()),

('882a100d55fffff', 'late_night', 14.90, 5.5,  64, now()),
('882a100d57fffff', 'late_night', 12.40, 7.2,  41, now()),
('882a100d59fffff', 'late_night', 17.20, 4.0,  89, now()),

-- ── Brooklyn + Queens, NYC ─────────────────────────────────────────────────
('882a1072c5fffff', 'morning',    11.20, 6.2,  55, now()),
('882a1072c7fffff', 'morning',    13.60, 4.8,  78, now()),
('882a107291fffff', 'morning',     8.90, 8.1,  32, now()),

('882a1072c5fffff', 'lunch',      14.80, 4.0,  91, now()),
('882a1072c7fffff', 'lunch',      16.30, 3.4, 112, now()),
('882a107291fffff', 'lunch',      10.50, 6.5,  48, now()),

('882a1072c5fffff', 'dinner',     13.40, 4.9,  84, now()),
('882a1072c7fffff', 'dinner',     15.70, 3.7, 108, now()),
('882a107291fffff', 'dinner',      9.80, 7.3,  39, now()),

('882a1072c7fffff', 'late_night', 11.90, 6.0,  27, now()),

-- ── Downtown Los Angeles ───────────────────────────────────────────────────
('8829a30d69fffff', 'morning',    12.40, 5.8,  67, now()),
('8829a30d6bfffff', 'morning',    15.30, 3.9, 103, now()),
('8829a30d61fffff', 'morning',     9.10, 7.4,  38, now()),
('8829a30559fffff', 'morning',    17.80, 3.1, 145, now()),

('8829a30d69fffff', 'lunch',      16.70, 3.5, 118, now()),
('8829a30d6bfffff', 'lunch',      19.20, 2.7, 172, now()),
('8829a30d61fffff', 'lunch',      11.40, 6.0,  59, now()),
('8829a30559fffff', 'lunch',      21.50, 2.2, 198, now()),

('8829a30d69fffff', 'dinner',     15.90, 3.8, 124, now()),
('8829a30d6bfffff', 'dinner',     18.60, 2.9, 165, now()),
('8829a30d61fffff', 'dinner',     10.70, 6.5,  52, now()),
('8829a30559fffff', 'dinner',     20.40, 2.4, 213, now()),

('8829a30d6bfffff', 'late_night', 13.20, 5.1,  45, now()),
('8829a30559fffff', 'late_night', 16.40, 3.6,  71, now()),

-- ── Santa Monica / West LA ─────────────────────────────────────────────────
('8829a30549fffff', 'morning',    16.20, 3.6,  94, now()),
('8829a3054bfffff', 'lunch',      19.80, 2.5, 156, now()),
('8829a3054bfffff', 'dinner',     18.30, 2.8, 148, now()),
('8829a3054bfffff', 'late_night', 11.60, 6.8,  33, now()),

-- ── Chicago Loop ───────────────────────────────────────────────────────────
('8828309153fffff', 'morning',    13.80, 4.5,  82, now()),
('8828309155fffff', 'morning',    16.40, 3.3, 118, now()),
('882830915bfffff', 'morning',    11.20, 5.9,  53, now()),

('8828309153fffff', 'lunch',      18.20, 2.9, 147, now()),
('8828309155fffff', 'lunch',      20.90, 2.2, 203, now()),
('882830915bfffff', 'lunch',      13.60, 4.8,  78, now()),

('8828309153fffff', 'dinner',     17.50, 3.1, 139, now()),
('8828309155fffff', 'dinner',     19.70, 2.5, 187, now()),
('882830915bfffff', 'dinner',     12.80, 5.2,  67, now()),

('8828309155fffff', 'late_night', 14.30, 4.7,  49, now()),

-- ── Wicker Park / Logan Square, Chicago ───────────────────────────────────
('8828309141fffff', 'dinner',     15.10, 4.0, 101, now()),
('8828309143fffff', 'dinner',     12.30, 5.5,  64, now()),
('8828309141fffff', 'late_night', 17.80, 3.2,  88, now()),

-- ── Houston Downtown ───────────────────────────────────────────────────────
('88241ad6c7fffff', 'morning',     9.80, 7.1,  44, now()),
('88241ad6c5fffff', 'morning',    12.30, 5.4,  69, now()),
('88241ad6cbfffff', 'morning',    14.90, 3.8,  97, now()),

('88241ad6c7fffff', 'lunch',      13.40, 5.0,  76, now()),
('88241ad6c5fffff', 'lunch',      15.80, 3.6, 112, now()),
('88241ad6cbfffff', 'lunch',      18.20, 2.8, 148, now()),

('88241ad6c7fffff', 'dinner',     12.70, 5.3,  71, now()),
('88241ad6c5fffff', 'dinner',     14.90, 4.1, 103, now()),
('88241ad6cbfffff', 'dinner',     17.60, 3.0, 138, now()),

('88241ad6cbfffff', 'late_night', 10.40, 7.8,  28, now()),

-- ── Medical Center / Midtown Houston ──────────────────────────────────────
('88241acecbfffff', 'lunch',      16.40, 3.4, 108, now()),
('88241acecbfffff', 'dinner',     15.20, 3.9,  96, now())

ON CONFLICT (h3_index, time_of_day) DO UPDATE
  SET avg_payout       = EXCLUDED.avg_payout,
      avg_wait_minutes = EXCLUDED.avg_wait_minutes,
      sample_count     = EXCLUDED.sample_count,
      updated_at       = now();
