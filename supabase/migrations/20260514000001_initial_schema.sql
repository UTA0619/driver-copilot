-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ─── User Profiles ────────────────────────────────────────────
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  platforms TEXT[] NOT NULL DEFAULT '{}',
  primary_city TEXT,
  is_pro BOOLEAN NOT NULL DEFAULT FALSE,
  onboarding_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ─── Deliveries ───────────────────────────────────────────────
CREATE TABLE deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('uber_eats', 'doordash')),
  payout NUMERIC(8,2) NOT NULL CHECK (payout >= 0),
  tip NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (tip >= 0),
  distance_miles NUMERIC(6,2) CHECK (distance_miles >= 0),
  duration_minutes INTEGER CHECK (duration_minutes >= 0),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  zone_h3_index TEXT,
  accepted_recommendation BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own deliveries"
  ON deliveries FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_deliveries_user_id ON deliveries(user_id);
CREATE INDEX idx_deliveries_started_at ON deliveries(user_id, started_at DESC);

-- ─── Zones ────────────────────────────────────────────────────
CREATE TABLE zones (
  h3_index TEXT PRIMARY KEY,
  city TEXT NOT NULL,
  label TEXT,
  geometry GEOMETRY(Polygon, 4326),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_zones_city ON zones(city);
CREATE INDEX idx_zones_geometry ON zones USING GIST(geometry);

-- ─── Zone Performance ─────────────────────────────────────────
CREATE TABLE zone_performance (
  h3_index TEXT NOT NULL REFERENCES zones(h3_index) ON DELETE CASCADE,
  time_of_day TEXT NOT NULL CHECK (time_of_day IN ('morning', 'lunch', 'dinner', 'late_night')),
  avg_payout NUMERIC(8,2),
  avg_wait_minutes NUMERIC(6,2),
  sample_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (h3_index, time_of_day)
);

-- ─── Coaching Insights ────────────────────────────────────────
CREATE TABLE coaching_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  insight_type TEXT NOT NULL CHECK (insight_type IN (
    'timing_suggestion', 'zone_suggestion', 'earnings_trend', 'recommendation_follow_rate'
  )),
  headline TEXT NOT NULL,
  body TEXT NOT NULL,
  data_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE coaching_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own insights"
  ON coaching_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_coaching_user_week ON coaching_insights(user_id, week_start DESC);

-- ─── Helper: auto-update updated_at ───────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
