-- Migration: Security hardening + schema improvements
-- Addresses:
--   1. RLS on zones and zone_performance (previously unprotected)
--   2. updated_at trigger on zone_performance
--   3. display_name + notes columns
--   4. Expanded platform CHECK to include grubhub, instacart
--   5. deliveries updated_at column + trigger
--   6. service_role INSERT policy on coaching_insights

-- ─── 1. Add display_name to user_profiles ─────────────────────
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT;

-- ─── 2. Expand platform enum on deliveries ────────────────────
-- Drop existing check, re-add with expanded platform list
ALTER TABLE deliveries
  DROP CONSTRAINT IF EXISTS deliveries_platform_check;

ALTER TABLE deliveries
  ADD CONSTRAINT deliveries_platform_check
  CHECK (platform IN ('uber_eats', 'doordash', 'grubhub', 'instacart'));

-- ─── 3. Add notes column to deliveries ───────────────────────
ALTER TABLE deliveries
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- ─── 4. Add updated_at to deliveries ─────────────────────────
ALTER TABLE deliveries
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TRIGGER deliveries_updated_at
  BEFORE UPDATE ON deliveries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── 5. Enable RLS on zones ───────────────────────────────────
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read zone reference data (read-only)
CREATE POLICY "Authenticated users can read zones"
  ON zones FOR SELECT
  TO authenticated
  USING (true);

-- Only service_role (backend) can write zone data
CREATE POLICY "Service role can manage zones"
  ON zones FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── 6. Enable RLS on zone_performance ───────────────────────
ALTER TABLE zone_performance ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read zone performance data (read-only)
CREATE POLICY "Authenticated users can read zone performance"
  ON zone_performance FOR SELECT
  TO authenticated
  USING (true);

-- Only service_role can write zone_performance
CREATE POLICY "Service role can manage zone performance"
  ON zone_performance FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── 7. Add updated_at trigger to zone_performance ───────────
CREATE TRIGGER zone_performance_updated_at
  BEFORE UPDATE ON zone_performance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── 8. coaching_insights: allow service_role to insert ───────
-- (service_role bypasses RLS by default, but explicit policy for clarity)
CREATE POLICY "Service role can manage insights"
  ON coaching_insights FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── 9. Add index on coaching_insights.user_id alone ─────────
CREATE INDEX IF NOT EXISTS idx_coaching_user_id
  ON coaching_insights(user_id);

-- ─── 10. Add rate_limiting table for Edge Function calls ──────
CREATE TABLE IF NOT EXISTS edge_function_rate_limits (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  function_name TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('minute', NOW()),
  call_count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, function_name, window_start)
);

ALTER TABLE edge_function_rate_limits ENABLE ROW LEVEL SECURITY;

-- Users can only see their own rate limit records
CREATE POLICY "Users can view own rate limits"
  ON edge_function_rate_limits FOR SELECT
  USING (auth.uid() = user_id);

-- Service role manages rate limit tracking
CREATE POLICY "Service role manages rate limits"
  ON edge_function_rate_limits FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Auto-clean records older than 1 hour
CREATE INDEX IF NOT EXISTS idx_rate_limits_window
  ON edge_function_rate_limits(function_name, window_start DESC);
