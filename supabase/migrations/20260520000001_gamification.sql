-- ─── Daily Goals ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_target NUMERIC(10,2) NOT NULL DEFAULT 100.00,
  weekly_target NUMERIC(10,2) GENERATED ALWAYS AS (daily_target * 5) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_goals_own" ON user_goals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── Streaks & XP ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_active_date DATE,
  total_xp INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_streaks_own" ON user_streaks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── Achievements ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_key TEXT NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_key)
);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_achievements_own" ON user_achievements FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── Trigger: update updated_at ───────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ language 'plpgsql';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'user_goals_updated_at') THEN
    CREATE TRIGGER user_goals_updated_at BEFORE UPDATE ON user_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'user_streaks_updated_at') THEN
    CREATE TRIGGER user_streaks_updated_at BEFORE UPDATE ON user_streaks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ─── Function: upsert_streak ──────────────────────────────────────
-- Called after a delivery is logged to update streak
CREATE OR REPLACE FUNCTION upsert_user_streak(p_user_id UUID, p_xp_gain INT DEFAULT 10)
RETURNS TABLE(current_streak INT, longest_streak INT, level INT, total_xp INT, streak_extended BOOLEAN) AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_streak user_streaks%ROWTYPE;
  v_extended BOOLEAN := false;
BEGIN
  SELECT * INTO v_streak FROM user_streaks WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_active_date, total_xp, level)
    VALUES (p_user_id, 1, 1, v_today, p_xp_gain, 1)
    RETURNING * INTO v_streak;
    v_extended := true;
  ELSE
    -- Same day: just add XP, no streak change
    IF v_streak.last_active_date = v_today THEN
      UPDATE user_streaks SET total_xp = total_xp + p_xp_gain,
        level = GREATEST(1, floor(sqrt((total_xp + p_xp_gain) / 50.0))::INT + 1)
      WHERE user_id = p_user_id RETURNING * INTO v_streak;
    -- Yesterday: extend streak
    ELSIF v_streak.last_active_date = v_today - INTERVAL '1 day' THEN
      UPDATE user_streaks SET
        current_streak = current_streak + 1,
        longest_streak = GREATEST(longest_streak, current_streak + 1),
        last_active_date = v_today,
        total_xp = total_xp + p_xp_gain,
        level = GREATEST(1, floor(sqrt((total_xp + p_xp_gain) / 50.0))::INT + 1)
      WHERE user_id = p_user_id RETURNING * INTO v_streak;
      v_extended := true;
    -- Gap: reset streak
    ELSE
      UPDATE user_streaks SET
        current_streak = 1,
        last_active_date = v_today,
        total_xp = total_xp + p_xp_gain,
        level = GREATEST(1, floor(sqrt((total_xp + p_xp_gain) / 50.0))::INT + 1)
      WHERE user_id = p_user_id RETURNING * INTO v_streak;
    END IF;
  END IF;

  RETURN QUERY SELECT v_streak.current_streak, v_streak.longest_streak, v_streak.level, v_streak.total_xp, v_extended;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
