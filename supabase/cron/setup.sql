-- ─── Supabase pg_cron setup ────────────────────────────────────────────────
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor) AFTER
-- the Edge Function `weekly-coaching-push` has been deployed:
--
--   supabase functions deploy weekly-coaching-push
--
-- Replace <PROJECT_REF> and <SERVICE_ROLE_KEY> with your actual values.
-- SERVICE_ROLE_KEY is in: Dashboard → Settings → API → service_role key

-- 1. Enable pg_cron extension (safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Grant cron usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- 3. Schedule weekly coaching push — every Monday at 9:00 AM UTC
SELECT cron.schedule(
  'weekly-coaching-push',       -- job name (unique)
  '0 9 * * 1',                  -- cron expression: Mon 09:00 UTC
  $$
  SELECT net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/weekly-coaching-push',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>',
      'Content-Type',  'application/json'
    ),
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);

-- 4. Verify the job was registered
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'weekly-coaching-push';

-- ── Manual test (run anytime to verify the function works) ──────────────────
-- SELECT net.http_post(
--   url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/weekly-coaching-push',
--   headers := jsonb_build_object(
--     'Authorization', 'Bearer <SERVICE_ROLE_KEY>',
--     'Content-Type',  'application/json'
--   ),
--   body    := '{}'::jsonb
-- );

-- ── Remove the job (if needed) ──────────────────────────────────────────────
-- SELECT cron.unschedule('weekly-coaching-push');
