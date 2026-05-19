-- Add push token storage to user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Index for fast lookup by push token
CREATE INDEX IF NOT EXISTS idx_user_profiles_push_token
  ON user_profiles (push_token)
  WHERE push_token IS NOT NULL;

-- Enable pg_cron extension (Supabase supports this)
-- Schedule the weekly coaching push every Monday at 9:00 UTC
-- This requires the pg_cron extension to be enabled in your Supabase project settings
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'weekly-coaching-push',
      '0 9 * * 1',  -- Every Monday at 9:00 UTC
      $$
        SELECT net.http_post(
          url := current_setting('app.supabase_url') || '/functions/v1/weekly-coaching-push',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.service_role_key')
          ),
          body := '{}'::jsonb
        )
      $$
    );
  END IF;
END $$;
